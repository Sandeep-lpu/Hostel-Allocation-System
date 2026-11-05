import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AllocationRun, AllocationRunDocument } from '../allocation/schemas/allocation-run.schema';
import { BedInventory, BedInventoryDocument } from '../inventory/schemas/bed-inventory.schema';
import { HostelApplication, HostelApplicationDocument } from '../application/schemas/hostel-application.schema';
import { Announcement, AnnouncementDocument } from './schemas/announcement.schema';
import { BedStatus } from '../inventory/enums/bed-status.enum';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(AllocationRun.name)
    private readonly runModel: Model<AllocationRunDocument>,
    @InjectModel(BedInventory.name)
    private readonly bedModel: Model<BedInventoryDocument>,
    @InjectModel(HostelApplication.name)
    private readonly applicationModel: Model<HostelApplicationDocument>,
    @InjectModel(Announcement.name)
    private readonly announcementModel: Model<AnnouncementDocument>,
  ) {}

  /**
   * Executive BI Analytics & Summary Report
   */
  async getExecutiveSummary(tenantId: string = 'univ-delhi-hostel') {
    // 1. Bed Inventory Analytics
    const beds = await this.bedModel.find({ tenantId }).exec();
    const totalBeds = beds.length;
    const occupiedBeds = beds.filter((b) => b.status === BedStatus.BOOKED).length;
    const availableBeds = beds.filter((b) => b.status === BedStatus.AVAILABLE).length;
    const maintenanceBeds = beds.filter((b) => b.status === BedStatus.MAINTENANCE).length;
    const overallOccupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    // Block-wise breakdown
    const bhBeds = beds.filter((b) => b.blockCode === 'BH-01');
    const ghBeds = beds.filter((b) => b.blockCode === 'GH-01');

    const bhOccupied = bhBeds.filter((b) => b.status === BedStatus.BOOKED).length;
    const ghOccupied = ghBeds.filter((b) => b.status === BedStatus.BOOKED).length;

    // 2. Application Metrics & Quota Breakdown
    const applications = await this.applicationModel.find({ tenantId }).exec();
    const totalApplications = applications.length;
    const allocatedApps = applications.filter((a) => a.status === 'ALLOCATED').length;
    const verifiedApps = applications.filter((a) => a.status === 'VERIFIED').length;
    const pendingApps = applications.filter((a) => a.status === 'SUBMITTED').length;

    const categoryDistribution: Record<string, number> = {
      GEN: 0,
      OBC: 0,
      SC: 0,
      ST: 0,
      EWS: 0,
    };
    applications.forEach((a) => {
      const cat = a.category || 'GEN';
      categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
    });

    // 3. Allocation Run Metrics
    const latestRun = await this.runModel.findOne({ tenantId }).sort({ createdAt: -1 }).exec();

    let preferenceStats = {
      p1Count: 0,
      p2Count: 0,
      p3Count: 0,
      satisfactionRate: 100,
    };

    let compatibilityBands = {
      tier90Plus: 0,
      tier80to89: 0,
      tier70to79: 0,
      below70: 0,
    };

    let averageCompScore = 88;
    let totalAssignedStudents = 0;
    let waitlistCount = 0;
    let overridesCount = 0;

    if (latestRun) {
      preferenceStats = {
        p1Count: latestRun.stats?.preference1Satisfied || 0,
        p2Count: latestRun.stats?.preference2Satisfied || 0,
        p3Count: latestRun.stats?.preference3Satisfied || 0,
        satisfactionRate: latestRun.stats?.preferenceSatisfactionRate || 100,
      };

      averageCompScore = latestRun.stats?.averageCompatibilityScore || 88;
      totalAssignedStudents = latestRun.assignments?.length || 0;
      waitlistCount = latestRun.waitingList?.filter((w) => w.status === 'WAITING').length || 0;
      overridesCount = latestRun.overrideHistory?.length || 0;

      (latestRun.assignments || []).forEach((a) => {
        const score = a.compatibilityScore || 85;
        if (score >= 90) compatibilityBands.tier90Plus++;
        else if (score >= 80) compatibilityBands.tier80to89++;
        else if (score >= 70) compatibilityBands.tier70to79++;
        else compatibilityBands.below70++;
      });
    }

    return {
      runId: latestRun?.runId || 'N/A',
      runStatus: latestRun?.status || 'N/A',
      inventory: {
        totalBeds,
        occupiedBeds,
        availableBeds,
        maintenanceBeds,
        overallOccupancyRate,
        blocks: {
          'BH-01': {
            name: 'Rabindranath Tagore Hall (Boys)',
            total: bhBeds.length,
            occupied: bhOccupied,
            available: bhBeds.length - bhOccupied,
            rate: bhBeds.length > 0 ? Math.round((bhOccupied / bhBeds.length) * 100) : 0,
          },
          'GH-01': {
            name: 'Kasturba Hall of Residence (Girls)',
            total: ghBeds.length,
            occupied: ghOccupied,
            available: ghBeds.length - ghOccupied,
            rate: ghBeds.length > 0 ? Math.round((ghOccupied / ghBeds.length) * 100) : 0,
          },
        },
      },
      applications: {
        total: totalApplications,
        allocated: allocatedApps,
        verified: verifiedApps,
        pending: pendingApps,
        categoryBreakdown: categoryDistribution,
      },
      allocationAnalytics: {
        totalAssigned: totalAssignedStudents,
        averageCompatibilityScore: averageCompScore,
        satisfactionRate: preferenceStats.satisfactionRate,
        preferences: preferenceStats,
        compatibilityBands,
        overridesCount,
        waitlistCount,
      },
    };
  }

  /**
   * Export Allocations as CSV
   */
  async generateAllocationsCsv(tenantId: string = 'univ-delhi-hostel') {
    const run = await this.runModel.findOne({ tenantId }).sort({ createdAt: -1 }).exec();
    const rows = [
      [
        'Roll Number',
        'Student Name',
        'Gender',
        'Category',
        'CGPA',
        'Hostel Block',
        'Floor',
        'Room Number',
        'Bed Label',
        'Compatibility %',
        'Overridden',
        'Warden Override Reason',
        'Allocation Explanation',
      ],
    ];

    if (run && run.assignments) {
      run.assignments.forEach((a) => {
        rows.push([
          a.studentRollNumber,
          `"${a.studentName}"`,
          a.gender,
          a.category,
          a.cgpa.toFixed(2),
          a.assignedBlockCode,
          String(a.assignedFloor),
          a.assignedRoomNumber,
          a.assignedBedLabel,
          `${a.compatibilityScore}%`,
          a.isOverridden ? 'YES' : 'NO',
          `"${a.overrideReason || 'N/A'}"`,
          `"${(a.allocationExplanation || '').replace(/"/g, '""')}"`,
        ]);
      });
    }

    return rows.map((r) => r.join(',')).join('\n');
  }

  /**
   * Export Bed Inventory as CSV
   */
  async generateInventoryCsv(tenantId: string = 'univ-delhi-hostel') {
    const beds = await this.bedModel.find({ tenantId }).sort({ blockCode: 1, floor: 1, roomNumber: 1 }).exec();
    const rows = [
      ['Block Code', 'Floor', 'Room Number', 'Bed Label', 'Category Code', 'Status', 'Assigned Roll Number', 'Assigned Student Name'],
    ];

    beds.forEach((b) => {
      rows.push([
        b.blockCode,
        String(b.floor),
        b.roomNumber,
        b.bedLabel,
        b.categoryCode,
        b.status,
        b.assignedStudentRollNumber || 'N/A',
        `"${b.assignedStudentName || 'N/A'}"`,
      ]);
    });

    return rows.map((r) => r.join(',')).join('\n');
  }

  /**
   * Export Waiting List as CSV
   */
  async generateWaitingListCsv(tenantId: string = 'univ-delhi-hostel') {
    const run = await this.runModel.findOne({ tenantId }).sort({ createdAt: -1 }).exec();
    const rows = [
      ['Priority Rank', 'Roll Number', 'Student Name', 'Gender', 'Category', 'CGPA', 'Preferred Block', 'Status', 'Reason', 'Promoted Room/Bed'],
    ];

    if (run && run.waitingList) {
      run.waitingList.forEach((w) => {
        rows.push([
          String(w.rank),
          w.studentRollNumber,
          `"${w.studentName}"`,
          w.gender || 'MALE',
          w.category,
          w.cgpa.toFixed(2),
          w.preferredBlockCode || 'BH-01',
          w.status || 'WAITING',
          `"${(w.reason || '').replace(/"/g, '""')}"`,
          w.status === 'PROMOTED' ? `${w.promotedToBlockCode}-${w.promotedToRoomNumber}-${w.promotedToBedLabel}` : 'N/A',
        ]);
      });
    }

    return rows.map((r) => r.join(',')).join('\n');
  }

  /**
   * Get campus announcements
   */
  async getAnnouncements(tenantId: string = 'univ-delhi-hostel') {
    return this.announcementModel.find({ tenantId, isActive: true }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Broadcast new announcement
   */
  async createAnnouncement(
    tenantId: string = 'univ-delhi-hostel',
    payload: {
      title: string;
      content: string;
      category?: string;
      targetAudience?: string;
      publishedBy?: string;
    },
  ) {
    return this.announcementModel.create({
      tenantId,
      title: payload.title,
      content: payload.content,
      category: payload.category || 'GENERAL',
      targetAudience: payload.targetAudience || 'ALL',
      publishedBy: payload.publishedBy || 'Dean of Student Welfare',
      isActive: true,
    });
  }
}

