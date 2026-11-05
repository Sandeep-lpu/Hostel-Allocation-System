import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AllocationRun,
  AllocationRunDocument,
  AllocationRunStatus,
  StudentAssignment,
  WaitingListEntry,
} from '../schemas/allocation-run.schema';
import { RoommateProfile, RoommateProfileDocument } from '../schemas/roommate-profile.schema';
import {
  HostelApplication,
  HostelApplicationDocument,
  ApplicationStatus,
} from '../../application/schemas/hostel-application.schema';
import {
  AllocationCycle,
  AllocationCycleDocument,
} from '../../application/schemas/allocation-cycle.schema';
import { BedInventory, BedInventoryDocument } from '../../inventory/schemas/bed-inventory.schema';
import { BedStatus } from '../../inventory/enums/bed-status.enum';
import { Gender } from '../../inventory/enums/gender.enum';

/**
 * Seeded PRNG for deterministic reproducibility
 */
function seededRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

@Injectable()
export class AllocationEngineService {
  private readonly logger = new Logger(AllocationEngineService.name);

  constructor(
    @InjectModel(AllocationRun.name)
    private readonly runModel: Model<AllocationRunDocument>,
    @InjectModel(RoommateProfile.name)
    private readonly roommateModel: Model<RoommateProfileDocument>,
    @InjectModel(HostelApplication.name)
    private readonly applicationModel: Model<HostelApplicationDocument>,
    @InjectModel(AllocationCycle.name)
    private readonly cycleModel: Model<AllocationCycleDocument>,
    @InjectModel(BedInventory.name)
    private readonly bedModel: Model<BedInventoryDocument>,
  ) {}

  /**
   * Calculate compatibility score (50% - 100%) between two roommate profiles
   */
  calculateCompatibilityScore(p1: RoommateProfile, p2: RoommateProfile): number {
    let score = 50; // base

    // 1. Sleep Schedule (max +15)
    if (p1.sleepSchedule === p2.sleepSchedule) score += 15;
    else if (p1.sleepSchedule === 'FLEXIBLE' || p2.sleepSchedule === 'FLEXIBLE') score += 10;
    else score += 2;

    // 2. Cleanliness Level (max +12)
    if (p1.cleanliness === p2.cleanliness) score += 12;
    else score += 6;

    // 3. Study Habit (max +10)
    if (p1.studyHabit === p2.studyHabit) score += 10;
    else if (p1.studyHabit === 'BACKGROUND_MUSIC' || p2.studyHabit === 'BACKGROUND_MUSIC') score += 6;
    else score += 3;

    // 4. Room Temperature (max +8)
    if (p1.roomTempPreference === p2.roomTempPreference) score += 8;
    else score += 4;

    // 5. Social Style (max +5)
    if (p1.socialStyle === p2.socialStyle || p1.socialStyle === 'BALANCED' || p2.socialStyle === 'BALANCED') score += 5;

    return Math.min(score, 98);
  }

  /**
   * Run the deterministic multi-pass allocation engine
   */
  async runAllocationEngine(
    tenantId: string = 'univ-delhi-hostel',
    cycleCode: string,
    randomSeed: number = 42,
    initiatedBy: string = 'Admin Allocation Engine',
  ): Promise<AllocationRunDocument> {
    this.logger.log(`Starting Allocation Run for cycle: ${cycleCode} with seed: ${randomSeed}...`);

    // 1. Verify Cycle
    const cycle = await this.cycleModel.findOne({ tenantId, cycleCode }).exec();
    if (!cycle) {
      throw new NotFoundException(`Allocation cycle '${cycleCode}' not found`);
    }

    // 2. Fetch Eligible (VERIFIED) Applications
    const applications = await this.applicationModel
      .find({
        tenantId,
        cycleCode,
        status: ApplicationStatus.VERIFIED,
      })
      .lean();

    if (applications.length === 0) {
      throw new BadRequestException(
        `No verified student applications found for cycle '${cycleCode}'. Please verify applications in Phase 2 first.`,
      );
    }

    // 3. Fetch Roommate Profiles for compatibility scoring
    const roommateProfiles = await this.roommateModel.find({ tenantId }).lean();
    const profileMap = new Map<string, RoommateProfile>();
    roommateProfiles.forEach((p) => profileMap.set(p.studentRollNumber, p));

    // 4. Fetch Available Beds from Inventory
    const availableBeds = await this.bedModel
      .find({
        tenantId,
        academicSession: cycle.academicSession,
        status: BedStatus.AVAILABLE,
      })
      .sort({ floor: 1, roomNumber: 1, bedLabel: 1 })
      .lean();

    const prng = seededRandom(randomSeed);

    // 5. Priority Sorting: Specially-abled first, then CGPA descending, seeded tie-breaker
    const sortedApps = [...applications].sort((a, b) => {
      if (a.isSpeciallyAbled && !b.isSpeciallyAbled) return -1;
      if (!a.isSpeciallyAbled && b.isSpeciallyAbled) return 1;

      if (b.cgpa !== a.cgpa) return b.cgpa - a.cgpa;

      return prng() - 0.5;
    });

    // Bed Tracking structures
    const occupiedBedIds = new Set<string>();
    const roomAllocationMap = new Map<string, { rollNumber: string; name: string; profile?: RoommateProfile }[]>();

    const assignments: StudentAssignment[] = [];
    const waitingList: WaitingListEntry[] = [];

    let p1Count = 0;
    let p2Count = 0;
    let p3Count = 0;
    let totalCompatibilityScore = 0;
    let compatibilityPairsCount = 0;

    // 6. Matching Process
    for (const app of sortedApps) {
      const allowedBlock = app.gender === Gender.FEMALE ? 'GH-01' : 'BH-01';
      let assignedBed: any = null;
      let matchedPrefRank = -1;

      // Check Preferences 1, 2, 3
      const prefs = app.preferences || [];
      for (const pref of prefs) {
        // Find available bed matching requested block & category
        const candidateBed = availableBeds.find(
          (b) =>
            !occupiedBedIds.has(b._id.toString()) &&
            b.blockCode === pref.blockCode &&
            b.categoryCode === pref.categoryCode &&
            (app.isSpeciallyAbled ? b.floor === 1 : true),
        );

        if (candidateBed) {
          assignedBed = candidateBed;
          matchedPrefRank = pref.preferenceRank;
          break;
        }
      }

      // If preferences exhausted, fallback to best available bed in gender-appropriate hostel
      if (!assignedBed) {
        assignedBed = availableBeds.find(
          (b) =>
            !occupiedBedIds.has(b._id.toString()) &&
            b.blockCode === allowedBlock &&
            (app.isSpeciallyAbled ? b.floor === 1 : true),
        );
        matchedPrefRank = -1;
      }

      if (assignedBed) {
        occupiedBedIds.add(assignedBed._id.toString());

        // Roommates in the same room
        const roomKey = `${assignedBed.blockCode}-${assignedBed.roomNumber}`;
        const existingRoommates = roomAllocationMap.get(roomKey) || [];

        // Compatibility calculation
        const studentProfile = profileMap.get(app.studentRollNumber);
        let roomCompScore = 88; // standard default

        if (existingRoommates.length > 0 && studentProfile) {
          let scoreSum = 0;
          let count = 0;
          for (const rm of existingRoommates) {
            if (rm.profile) {
              scoreSum += this.calculateCompatibilityScore(studentProfile, rm.profile);
              count += 1;
            }
          }
          if (count > 0) {
            roomCompScore = Math.round(scoreSum / count);
            totalCompatibilityScore += roomCompScore;
            compatibilityPairsCount += 1;
          }
        } else {
          totalCompatibilityScore += roomCompScore;
          compatibilityPairsCount += 1;
        }

        // Update Roommates list
        roomAllocationMap.set(roomKey, [
          ...existingRoommates,
          { rollNumber: app.studentRollNumber, name: app.studentName, profile: studentProfile },
        ]);

        if (matchedPrefRank === 1) p1Count++;
        else if (matchedPrefRank === 2) p2Count++;
        else if (matchedPrefRank === 3) p3Count++;

        // Detailed Transparent Explanation
        let explanation = '';
        if (app.isSpeciallyAbled) {
          explanation = `Priority Accessibility Allotment: Assigned Ground Floor ${assignedBed.roomNumber} (${assignedBed.bedLabel}) in ${assignedBed.blockCode}.`;
        } else if (matchedPrefRank > 0) {
          explanation = `Matched Preference #${matchedPrefRank} (${assignedBed.blockCode} • ${assignedBed.categoryCode}) based on merit rank (CGPA ${app.cgpa}) under ${app.category} Quota. Roommate compatibility score: ${roomCompScore}%.`;
        } else {
          explanation = `All 3 requested preferences were filled by higher merit applicants. Allocated best available room in ${assignedBed.blockCode} (Floor ${assignedBed.floor}, Room ${assignedBed.roomNumber}) under standard fallback rule.`;
        }

        assignments.push({
          studentRollNumber: app.studentRollNumber,
          studentName: app.studentName,
          gender: app.gender,
          category: app.category,
          isSpeciallyAbled: app.isSpeciallyAbled,
          cgpa: app.cgpa,
          preferenceSatisfied: matchedPrefRank,
          assignedBlockCode: assignedBed.blockCode,
          assignedFloor: assignedBed.floor,
          assignedRoomNumber: assignedBed.roomNumber,
          assignedBedLabel: assignedBed.bedLabel,
          assignedBedId: assignedBed._id.toString(),
          roommates: existingRoommates.map((r) => ({ rollNumber: r.rollNumber, name: r.name })),
          compatibilityScore: roomCompScore,
          allocationExplanation: explanation,
        });
      } else {
        // Placed on Waiting List
        waitingList.push({
          rank: waitingList.length + 1,
          studentRollNumber: app.studentRollNumber,
          studentName: app.studentName,
          cgpa: app.cgpa,
          category: app.category,
          reason: `Hostel capacity exhausted for ${allowedBlock}. Placed on priority waiting list at rank #${waitingList.length + 1}.`,
        });
      }
    }

    // 7. Calculate Run Metrics
    const totalAssigned = assignments.length;
    const prefSatisfiedCount = p1Count + p2Count + p3Count;
    const preferenceSatisfactionRate =
      totalAssigned > 0 ? Math.round((prefSatisfiedCount / totalAssigned) * 100) : 0;
    const averageCompatibilityScore =
      compatibilityPairsCount > 0 ? Math.round(totalCompatibilityScore / compatibilityPairsCount) : 85;

    const runId = `RUN-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const allocationRun = await this.runModel.create({
      tenantId,
      runId,
      cycleCode,
      academicSession: cycle.academicSession,
      randomSeed,
      status: AllocationRunStatus.DRAFT_GENERATED,
      stats: {
        totalEligibleStudents: sortedApps.length,
        totalBedsAssigned: totalAssigned,
        preference1Satisfied: p1Count,
        preference2Satisfied: p2Count,
        preference3Satisfied: p3Count,
        preferenceSatisfactionRate,
        averageCompatibilityScore,
        waitingListCount: waitingList.length,
      },
      assignments,
      waitingList,
      auditTrail: [
        {
          action: 'DRAFT_GENERATED',
          by: initiatedBy,
          at: new Date(),
          reason: `Automated run generated using Seed: ${randomSeed}. 1st Preference satisfaction: ${p1Count}/${totalAssigned}.`,
        },
      ],
    });

    this.logger.log(
      `Allocation Run ${runId} completed! Assigned: ${totalAssigned}, Waiting: ${waitingList.length}, Avg Comp: ${averageCompatibilityScore}%`,
    );

    return allocationRun;
  }

  /**
   * Get all allocation runs
   */
  async getAllRuns(tenantId: string = 'univ-delhi-hostel') {
    return this.runModel.find({ tenantId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get specific run by runId
   */
  async getRunById(tenantId: string = 'univ-delhi-hostel', runId: string) {
    const run = await this.runModel.findOne({ tenantId, runId }).exec();
    if (!run) {
      throw new NotFoundException(`Allocation run '${runId}' not found`);
    }
    return run;
  }

  /**
   * Get latest published allocation (Student Portal result view)
   */
  async getLatestPublishedAllocation(tenantId: string = 'univ-delhi-hostel') {
    return this.runModel
      .findOne({
        tenantId,
        status: { $in: [AllocationRunStatus.PUBLISHED, AllocationRunStatus.APPROVED, AllocationRunStatus.DRAFT_GENERATED] },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Save or update student roommate compatibility questionnaire
   */
  async upsertRoommateProfile(tenantId: string = 'univ-delhi-hostel', data: Partial<RoommateProfile>) {
    return this.roommateModel.findOneAndUpdate(
      { tenantId, studentRollNumber: data.studentRollNumber?.toUpperCase() },
      { $set: { ...data, tenantId, studentRollNumber: data.studentRollNumber?.toUpperCase() } },
      { upsert: true, new: true },
    );
  }

  /**
   * Get student roommate questionnaire
   */
  async getRoommateProfile(tenantId: string = 'univ-delhi-hostel', studentRollNumber: string) {
    return this.roommateModel
      .findOne({ tenantId, studentRollNumber: studentRollNumber.toUpperCase() })
      .exec();
  }
}
