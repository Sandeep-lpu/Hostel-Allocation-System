import { Injectable, Logger, NotFoundException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AllocationCycle, AllocationCycleDocument, CycleStatus } from './schemas/allocation-cycle.schema';
import { HostelApplication, HostelApplicationDocument, ApplicationStatus } from './schemas/hostel-application.schema';
import { Gender } from '../inventory/enums/gender.enum';

@Injectable()
export class ApplicationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ApplicationService.name);

  constructor(
    @InjectModel(AllocationCycle.name)
    private readonly cycleModel: Model<AllocationCycleDocument>,
    @InjectModel(HostelApplication.name)
    private readonly applicationModel: Model<HostelApplicationDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedInitialCycleAndApplications();
  }

  /**
   * Get the current active allocation cycle
   */
  async getActiveCycle(tenantId: string = 'univ-delhi-hostel'): Promise<AllocationCycleDocument> {
    let cycle = await this.cycleModel.findOne({ tenantId, status: CycleStatus.ACTIVE }).exec();
    if (!cycle) {
      // Find latest cycle
      cycle = await this.cycleModel.findOne({ tenantId }).sort({ createdAt: -1 }).exec();
    }
    if (!cycle) {
      // Seed default active cycle
      cycle = await this.cycleModel.create({
        tenantId,
        cycleCode: 'CYCLE-2026-FALL',
        title: 'Academic Session 2026-27 (Fall Semester Allotment)',
        academicSession: 'hostel-allotment-2026',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-11-30'),
        status: CycleStatus.ACTIVE,
        applicationFee: 0,
        eligibilityPolicy: {
          minCgpa: 6.0,
          eligibleProgrammes: ['B.Tech', 'M.Tech', 'B.Sc', 'MCA', 'PhD', 'Dual Degree'],
          eligibleYears: [1, 2, 3, 4],
          categoryQuotas: { GENERAL: 40, OBC: 27, SC: 15, ST: 7.5, EWS: 10, PWD: 5 },
          requireDocumentVerification: true,
        },
      });
    }
    return cycle;
  }

  /**
   * List all cycles
   */
  async getAllCycles(tenantId: string = 'univ-delhi-hostel') {
    return this.cycleModel.find({ tenantId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Create or update cycle
   */
  async upsertCycle(tenantId: string = 'univ-delhi-hostel', data: Partial<AllocationCycle>) {
    const cycleCode = data.cycleCode || `CYCLE-${new Date().getFullYear()}-FALL`;
    return this.cycleModel.findOneAndUpdate(
      { tenantId, cycleCode },
      { $set: { ...data, tenantId, cycleCode } },
      { upsert: true, new: true },
    );
  }

  /**
   * Submit or update student hostel application
   */
  async submitApplication(tenantId: string = 'univ-delhi-hostel', dto: any) {
    const activeCycle = await this.getActiveCycle(tenantId);
    if (!activeCycle) {
      throw new BadRequestException('No active hostel allocation cycle currently open.');
    }

    const rollNumber = dto.studentRollNumber?.toUpperCase();
    if (!rollNumber) {
      throw new BadRequestException('Student roll number is required');
    }

    // Check automatic eligibility criteria
    const minCgpa = activeCycle.eligibilityPolicy.minCgpa || 6.0;
    const cgpaPassed = Number(dto.cgpa || 0) >= minCgpa;
    const eligibleProgrammes = activeCycle.eligibilityPolicy.eligibleProgrammes || [];
    const programmePassed = eligibleProgrammes.some((p) =>
      dto.course?.toLowerCase().includes(p.toLowerCase()),
    );

    // Mandatory documents check
    const mandatoryDocs = activeCycle.requiredDocuments.filter((d) => d.mandatory);
    const submittedDocIds = (dto.documents || []).map((d: any) => d.documentId);
    const documentsPassed = mandatoryDocs.every((d) => submittedDocIds.includes(d.id));

    const isOverallEligible = cgpaPassed && programmePassed && documentsPassed;

    let summary = '';
    if (!cgpaPassed) summary += `CGPA ${dto.cgpa} is below minimum requirement (${minCgpa}). `;
    if (!programmePassed) summary += `Course ${dto.course} not in eligible list. `;
    if (!documentsPassed) summary += `Mandatory document proofs missing. `;
    if (isOverallEligible) summary = 'All university policy criteria satisfied. Application verified for allocation.';

    const applicationNumber =
      dto.applicationNumber ||
      `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const application = await this.applicationModel.findOneAndUpdate(
      { tenantId, cycleCode: activeCycle.cycleCode, studentRollNumber: rollNumber },
      {
        $set: {
          tenantId,
          applicationNumber,
          cycleCode: activeCycle.cycleCode,
          studentRollNumber: rollNumber,
          studentName: dto.studentName,
          gender: dto.gender,
          course: dto.course || 'B.Tech Computer Science & Engineering',
          yearOfStudy: dto.yearOfStudy || 2,
          cgpa: Number(dto.cgpa || 8.0),
          category: dto.category || 'GENERAL',
          feeCategory: dto.feeCategory || 'REGULAR',
          isSpeciallyAbled: Boolean(dto.isSpeciallyAbled),
          guardianName: dto.guardianName || 'Guardian',
          guardianMobile: dto.guardianMobile || '9876543210',
          guardianRelation: dto.guardianRelation || 'Father',
          emergencyContact: dto.emergencyContact || '9876543210',
          address: dto.address || 'New Delhi, India',
          preferences: dto.preferences || [],
          documents: dto.documents || [],
          status: dto.status || ApplicationStatus.SUBMITTED,
          eligibilityResult: {
            cgpaPassed,
            programmePassed,
            documentsPassed,
            feeCategoryPassed: true,
            isOverallEligible,
            summary,
          },
        },
      },
      { upsert: true, new: true },
    );

    this.logger.log(
      `Application submitted for ${rollNumber}: ${application.applicationNumber} (Eligible: ${isOverallEligible})`,
    );

    return application;
  }

  /**
   * Get single application by student roll number
   */
  async getApplicationByRollNumber(
    tenantId: string = 'univ-delhi-hostel',
    rollNumber: string,
    cycleCode?: string,
  ) {
    const query: any = { tenantId, studentRollNumber: rollNumber.toUpperCase() };
    if (cycleCode) query.cycleCode = cycleCode;

    return this.applicationModel.findOne(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get all applications with search and filters (Admin Portal)
   */
  async getAllApplications(
    tenantId: string = 'univ-delhi-hostel',
    filters: {
      cycleCode?: string;
      status?: string;
      gender?: string;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const query: any = { tenantId };

    if (filters.cycleCode) query.cycleCode = filters.cycleCode;
    if (filters.status && filters.status !== 'ALL') query.status = filters.status;
    if (filters.gender && filters.gender !== 'ALL') query.gender = filters.gender;
    if (filters.category && filters.category !== 'ALL') query.category = filters.category;

    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { studentRollNumber: searchRegex },
        { studentName: searchRegex },
        { applicationNumber: searchRegex },
        { course: searchRegex },
      ];
    }

    const page = filters.page || 1;
    const limit = filters.limit || 50;

    const [total, applications] = await Promise.all([
      this.applicationModel.countDocuments(query),
      this.applicationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      applications,
    };
  }

  /**
   * Warden / Admin Application Verification & Audit
   */
  async verifyApplication(
    applicationId: string,
    action: {
      status: ApplicationStatus;
      verificationNotes?: string;
      rejectionReason?: string;
      verifiedBy: string;
      markDocumentsVerified?: boolean;
    },
  ) {
    const application = await this.applicationModel.findById(applicationId);
    if (!application) {
      throw new NotFoundException(`Application '${applicationId}' not found`);
    }

    application.status = action.status;
    application.verifiedBy = action.verifiedBy;
    application.verifiedAt = new Date();
    if (action.verificationNotes) application.verificationNotes = action.verificationNotes;
    if (action.rejectionReason) application.rejectionReason = action.rejectionReason;

    if (action.markDocumentsVerified) {
      application.documents = application.documents.map((d) => ({
        ...d,
        verified: true,
      }));
      application.eligibilityResult.documentsPassed = true;
    }

    if (action.status === ApplicationStatus.VERIFIED) {
      application.eligibilityResult.isOverallEligible = true;
      application.eligibilityResult.summary = 'Application formally verified and approved by Warden/Administration.';
    } else if (action.status === ApplicationStatus.REJECTED) {
      application.eligibilityResult.isOverallEligible = false;
      application.eligibilityResult.summary = `Application rejected: ${action.rejectionReason || 'Eligibility criteria not met'}`;
    } else if (action.status === ApplicationStatus.ACTION_REQUIRED) {
      application.eligibilityResult.isOverallEligible = false;
      application.eligibilityResult.summary = `Action Required: ${action.verificationNotes || 'Please resubmit documents'}`;
    }

    await application.save();

    this.logger.log(
      `Application ${application.applicationNumber} updated to status ${action.status} by ${action.verifiedBy}`,
    );

    return application;
  }

  /**
   * Admin Dashboard Application Metrics
   */
  async getApplicationMetrics(tenantId: string = 'univ-delhi-hostel', cycleCode?: string) {
    const query: any = { tenantId };
    if (cycleCode) query.cycleCode = cycleCode;

    const [total, submitted, verified, rejected, actionRequired, maleCount, femaleCount] =
      await Promise.all([
        this.applicationModel.countDocuments(query),
        this.applicationModel.countDocuments({ ...query, status: ApplicationStatus.SUBMITTED }),
        this.applicationModel.countDocuments({ ...query, status: ApplicationStatus.VERIFIED }),
        this.applicationModel.countDocuments({ ...query, status: ApplicationStatus.REJECTED }),
        this.applicationModel.countDocuments({ ...query, status: ApplicationStatus.ACTION_REQUIRED }),
        this.applicationModel.countDocuments({ ...query, gender: Gender.MALE }),
        this.applicationModel.countDocuments({ ...query, gender: Gender.FEMALE }),
      ]);

    return {
      total,
      submitted,
      verified,
      rejected,
      actionRequired,
      genderBreakdown: { male: maleCount, female: femaleCount },
      verificationRate: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  }

  /**
   * Seed realistic sample applications for testing Phase 2
   */
  async seedInitialCycleAndApplications() {
    const tenantId = 'univ-delhi-hostel';
    const cycle = await this.getActiveCycle(tenantId);

    const existingCount = await this.applicationModel.countDocuments({ tenantId });
    if (existingCount > 0) return;

    this.logger.log('Seeding initial realistic student applications for Phase 2 testing...');

    const sampleApplications = [
      {
        tenantId,
        applicationNumber: 'APP-2026-1024',
        cycleCode: cycle.cycleCode,
        studentRollNumber: '2024BCSE101',
        studentName: 'Sandeep Kumar',
        gender: Gender.MALE,
        course: 'B.Tech Computer Science & Engineering',
        yearOfStudy: 2,
        cgpa: 8.85,
        category: 'GENERAL',
        feeCategory: 'REGULAR',
        isSpeciallyAbled: false,
        guardianName: 'Ram Kumar',
        guardianMobile: '+91 9876543210',
        guardianRelation: 'Father',
        emergencyContact: '+91 9876543210',
        address: 'Sector 62, Noida, Uttar Pradesh, India',
        preferences: [
          { preferenceRank: 1, blockCode: 'BH-01', categoryCode: 'STUDIO_AC_2S_PANTRY' },
          { preferenceRank: 2, blockCode: 'BH-01', categoryCode: 'STD_AC_2S' },
          { preferenceRank: 3, blockCode: 'BH-01', categoryCode: 'STD_AC_4S' },
        ],
        documents: [
          { documentId: 'gov_id', documentName: 'Aadhaar Card (National ID)', fileUrl: 'https://docs.university.edu/aadhaar-2024bcse101.pdf', verified: true, uploadedAt: new Date() },
          { documentId: 'fitness_cert', documentName: 'University Medical Fitness Certificate', fileUrl: 'https://docs.university.edu/med-fitness-2024bcse101.pdf', verified: true, uploadedAt: new Date() },
        ],
        status: ApplicationStatus.VERIFIED,
        verificationNotes: 'All academic credentials, ID documents, and medical fitness cleared.',
        verifiedBy: 'Dr. Ramesh Sharma (Chief Warden)',
        verifiedAt: new Date(),
        eligibilityResult: {
          cgpaPassed: true,
          programmePassed: true,
          documentsPassed: true,
          feeCategoryPassed: true,
          isOverallEligible: true,
          summary: 'All university policy criteria satisfied. Application verified for allocation draft.',
        },
      },
      {
        tenantId,
        applicationNumber: 'APP-2026-1025',
        cycleCode: cycle.cycleCode,
        studentRollNumber: '2024BCSE102',
        studentName: 'Priya Sharma',
        gender: Gender.FEMALE,
        course: 'B.Tech Information Technology',
        yearOfStudy: 2,
        cgpa: 9.15,
        category: 'GENERAL',
        feeCategory: 'REGULAR',
        isSpeciallyAbled: false,
        guardianName: 'Sunita Sharma',
        guardianMobile: '+91 9876543212',
        guardianRelation: 'Mother',
        emergencyContact: '+91 9876543212',
        address: 'Civil Lines, Delhi, India',
        preferences: [
          { preferenceRank: 1, blockCode: 'GH-01', categoryCode: 'STUDIO_AC_2S_PANTRY' },
          { preferenceRank: 2, blockCode: 'GH-01', categoryCode: 'STD_AC_2S' },
        ],
        documents: [
          { documentId: 'gov_id', documentName: 'Passport Copy', fileUrl: 'https://docs.university.edu/pass-priya.pdf', verified: true, uploadedAt: new Date() },
          { documentId: 'fitness_cert', documentName: 'Medical Certificate', fileUrl: 'https://docs.university.edu/med-priya.pdf', verified: true, uploadedAt: new Date() },
        ],
        status: ApplicationStatus.VERIFIED,
        verificationNotes: 'Documents verified and cleared.',
        verifiedBy: 'Prof. Anjali Verma (Warden GH-01)',
        verifiedAt: new Date(),
        eligibilityResult: {
          cgpaPassed: true,
          programmePassed: true,
          documentsPassed: true,
          feeCategoryPassed: true,
          isOverallEligible: true,
          summary: 'All university policy criteria satisfied. Application verified for allocation draft.',
        },
      },
      {
        tenantId,
        applicationNumber: 'APP-2026-1026',
        cycleCode: cycle.cycleCode,
        studentRollNumber: '2024BCSE103',
        studentName: 'Rahul Verma',
        gender: Gender.MALE,
        course: 'B.Tech Mechanical Engineering',
        yearOfStudy: 2,
        cgpa: 7.20,
        category: 'OBC',
        feeCategory: 'CONCESSION',
        isSpeciallyAbled: false,
        guardianName: 'K. L. Verma',
        guardianMobile: '+91 9876543214',
        guardianRelation: 'Father',
        emergencyContact: '+91 9876543214',
        address: 'Laxmi Nagar, New Delhi, India',
        preferences: [
          { preferenceRank: 1, blockCode: 'BH-01', categoryCode: 'STD_AC_4S' },
          { preferenceRank: 2, blockCode: 'BH-01', categoryCode: 'STD_COOL_2S' },
        ],
        documents: [
          { documentId: 'gov_id', documentName: 'Voter ID Card', fileUrl: 'https://docs.university.edu/voter-rahul.pdf', verified: true, uploadedAt: new Date() },
        ],
        status: ApplicationStatus.ACTION_REQUIRED,
        verificationNotes: 'Medical Fitness Certificate is missing or expired. Please upload signed copy from University Health Center.',
        verifiedBy: 'Dr. Ramesh Sharma (Chief Warden)',
        verifiedAt: new Date(),
        eligibilityResult: {
          cgpaPassed: true,
          programmePassed: true,
          documentsPassed: false,
          feeCategoryPassed: true,
          isOverallEligible: false,
          summary: 'Action Required: Medical Fitness Certificate missing.',
        },
      },
      {
        tenantId,
        applicationNumber: 'APP-2026-1027',
        cycleCode: cycle.cycleCode,
        studentRollNumber: '2024BCSE104',
        studentName: 'Ananya Roy',
        gender: Gender.FEMALE,
        course: 'B.Tech Electronics & Communication',
        yearOfStudy: 2,
        cgpa: 8.40,
        category: 'GENERAL',
        feeCategory: 'REGULAR',
        isSpeciallyAbled: false,
        guardianName: 'Subhash Roy',
        guardianMobile: '+91 9876543216',
        guardianRelation: 'Father',
        emergencyContact: '+91 9876543216',
        address: 'Salt Lake, Kolkata, India',
        preferences: [
          { preferenceRank: 1, blockCode: 'GH-01', categoryCode: 'STD_AC_2S' },
          { preferenceRank: 2, blockCode: 'GH-01', categoryCode: 'STD_AC_3S' },
        ],
        documents: [
          { documentId: 'gov_id', documentName: 'Aadhaar Card', fileUrl: 'https://docs.university.edu/aadhaar-ananya.pdf', verified: false, uploadedAt: new Date() },
          { documentId: 'fitness_cert', documentName: 'Medical Certificate', fileUrl: 'https://docs.university.edu/med-ananya.pdf', verified: false, uploadedAt: new Date() },
        ],
        status: ApplicationStatus.SUBMITTED,
        verificationNotes: '',
        verifiedBy: '',
        verifiedAt: null,
        eligibilityResult: {
          cgpaPassed: true,
          programmePassed: true,
          documentsPassed: true,
          feeCategoryPassed: true,
          isOverallEligible: true,
          summary: 'Application submitted. Pending Warden document verification.',
        },
      },
    ];

    await this.applicationModel.insertMany(sampleApplications);
    this.logger.log(`Seeded ${sampleApplications.length} sample applications for Phase 2!`);
  }
}
