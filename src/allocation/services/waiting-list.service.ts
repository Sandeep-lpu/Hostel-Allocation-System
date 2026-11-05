import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  AllocationRun,
  AllocationRunDocument,
  WaitingListEntry,
  StudentAssignment,
} from '../schemas/allocation-run.schema';
import { BedInventory, BedInventoryDocument } from '../../inventory/schemas/bed-inventory.schema';
import {
  HostelApplication,
  HostelApplicationDocument,
  ApplicationStatus,
} from '../../application/schemas/hostel-application.schema';
import { BedStatus } from '../../inventory/enums/bed-status.enum';
import { Gender } from '../../inventory/enums/gender.enum';

@Injectable()
export class WaitingListService {
  private readonly logger = new Logger(WaitingListService.name);

  constructor(
    @InjectModel(AllocationRun.name)
    private readonly runModel: Model<AllocationRunDocument>,
    @InjectModel(BedInventory.name)
    private readonly bedModel: Model<BedInventoryDocument>,
    @InjectModel(HostelApplication.name)
    private readonly applicationModel: Model<HostelApplicationDocument>,
  ) {}

  /**
   * Helper: Get target allocation run
   */
  private async getTargetRun(tenantId: string = 'univ-delhi-hostel', runId?: string) {
    let run: AllocationRunDocument | null = null;
    if (runId) {
      run = await this.runModel.findOne({ tenantId, runId }).exec();
    } else {
      run = await this.runModel.findOne({ tenantId }).sort({ createdAt: -1 }).exec();
    }

    if (!run) {
      throw new NotFoundException('No active allocation run found');
    }
    return run;
  }

  /**
   * Get Active Waiting List with priority ranking and summary metrics
   */
  async getWaitingList(tenantId: string = 'univ-delhi-hostel', runId?: string) {
    const run = await this.getTargetRun(tenantId, runId);

    const waitingEntries = (run.waitingList || []).filter((e) => e.status === 'WAITING');
    const promotedEntries = (run.waitingList || []).filter((e) => e.status === 'PROMOTED');

    const malesWaiting = waitingEntries.filter((e) => e.gender === Gender.MALE).length;
    const femalesWaiting = waitingEntries.filter((e) => e.gender === Gender.FEMALE).length;

    // Sort active waiting entries by rank ASC
    const sortedWaiting = [...waitingEntries].sort((a, b) => a.rank - b.rank);

    return {
      runId: run.runId,
      cycleCode: run.cycleCode,
      academicSession: run.academicSession,
      status: run.status,
      stats: {
        totalWaiting: waitingEntries.length,
        totalPromoted: promotedEntries.length,
        malesWaiting,
        femalesWaiting,
      },
      waitingList: sortedWaiting,
      promotedList: promotedEntries,
      movementLog: run.waitingListMovementLog || [],
    };
  }

  /**
   * Track real-time bed vacancies suitable for waitlist promotion
   */
  async getAvailableVacancies(tenantId: string = 'univ-delhi-hostel', blockCode?: string) {
    const filter: any = {
      tenantId,
      status: BedStatus.AVAILABLE,
    };
    if (blockCode && blockCode !== 'ALL') {
      filter.blockCode = blockCode;
    }

    const beds = await this.bedModel.find(filter).sort({ blockCode: 1, floor: 1, roomNumber: 1 }).exec();

    // Enrich with suitable gender
    const enriched = beds.map((b) => ({
      bedId: b._id.toString(),
      blockCode: b.blockCode,
      hostelName: b.blockCode === 'GH-01' ? 'Kasturba Hall of Residence' : 'Rabindranath Tagore Hall',
      gender: b.blockCode === 'GH-01' ? Gender.FEMALE : Gender.MALE,
      floor: b.floor,
      roomNumber: b.roomNumber,
      bedLabel: b.bedLabel,
      roomType: b.categoryCode,
      isAccessible: b.floor === 1,
      status: b.status,
    }));

    return {
      totalVacancies: enriched.length,
      maleVacancies: enriched.filter((b) => b.gender === Gender.MALE).length,
      femaleVacancies: enriched.filter((b) => b.gender === Gender.FEMALE).length,
      vacancies: enriched,
    };
  }

  /**
   * Promote next or targeted student from waitlist into a vacant bed
   */
  async promoteStudent(
    tenantId: string = 'univ-delhi-hostel',
    payload: {
      runId?: string;
      studentRollNumber: string;
      targetBlockCode?: string;
      targetRoomNumber?: string;
      targetBedLabel?: string;
      authorizedBy: string;
    },
  ) {
    const run = await this.getTargetRun(tenantId, payload.runId);

    const studentIndex = (run.waitingList || []).findIndex(
      (e) => e.studentRollNumber.toUpperCase() === payload.studentRollNumber.toUpperCase() && e.status === 'WAITING',
    );

    if (studentIndex === -1) {
      throw new NotFoundException(`Candidate '${payload.studentRollNumber}' is not currently active on the waiting list.`);
    }

    const candidate = run.waitingList[studentIndex];
    const prevRank = candidate.rank;

    // 1. Determine Target Bed
    let assignedBed: BedInventoryDocument | null = null;
    if (payload.targetBlockCode && payload.targetRoomNumber && payload.targetBedLabel) {
      assignedBed = await this.bedModel.findOne({
        tenantId,
        blockCode: payload.targetBlockCode,
        roomNumber: payload.targetRoomNumber,
        bedLabel: payload.targetBedLabel,
        status: BedStatus.AVAILABLE,
      }).exec();

      if (!assignedBed) {
        throw new BadRequestException(
          `Target bed ${payload.targetBlockCode}-${payload.targetRoomNumber}-${payload.targetBedLabel} is not available.`,
        );
      }
    } else {
      // Auto-find next vacant bed matching student gender
      const blockRequired = candidate.gender === Gender.FEMALE ? 'GH-01' : 'BH-01';
      assignedBed = await this.bedModel.findOne({
        tenantId,
        blockCode: blockRequired,
        status: BedStatus.AVAILABLE,
      }).sort({ floor: 1, roomNumber: 1, bedLabel: 1 }).exec();

      if (!assignedBed) {
        throw new BadRequestException(
          `No vacant bed found in ${blockRequired} for ${candidate.gender} student ${candidate.studentName}.`,
        );
      }
    }

    // 2. Mark Bed BOOKED
    assignedBed.status = BedStatus.BOOKED;
    assignedBed.assignedStudentRollNumber = candidate.studentRollNumber;
    assignedBed.assignedStudentName = candidate.studentName;
    await assignedBed.save();

    // 3. Update HostelApplication to ALLOCATED
    await this.applicationModel.updateOne(
      {
        tenantId,
        cycleCode: run.cycleCode,
        studentRollNumber: candidate.studentRollNumber,
      },
      {
        $set: {
          status: ApplicationStatus.ALLOCATED,
          allocatedHostelName: assignedBed.blockCode,
          allocatedRoomNumber: assignedBed.roomNumber,
          allocatedBedLabel: assignedBed.bedLabel,
        },
      },
    );

    // 4. Update Candidate on Waiting List
    candidate.status = 'PROMOTED';
    candidate.promotedAt = new Date();
    candidate.promotedToBlockCode = assignedBed.blockCode;
    candidate.promotedToRoomNumber = assignedBed.roomNumber;
    candidate.promotedToBedLabel = assignedBed.bedLabel;

    // 5. Add to Run Assignments
    const newAssignment: StudentAssignment = {
      studentRollNumber: candidate.studentRollNumber,
      studentName: candidate.studentName,
      gender: candidate.gender,
      category: candidate.category,
      isSpeciallyAbled: false,
      cgpa: candidate.cgpa,
      preferenceSatisfied: 1,
      assignedBlockCode: assignedBed.blockCode,
      assignedFloor: assignedBed.floor,
      assignedRoomNumber: assignedBed.roomNumber,
      assignedBedLabel: assignedBed.bedLabel,
      assignedBedId: assignedBed._id.toString(),
      roommates: [],
      compatibilityScore: 88,
      allocationExplanation: `Promoted from Priority Waiting List (Previous Rank #${prevRank}) on Vacancy Allocation.`,
      isOverridden: false,
    };
    run.assignments.push(newAssignment);

    // 6. Re-rank remaining active waitlist candidates
    let currentRank = 1;
    const remainingWaiting = (run.waitingList || []).filter((e) => e.status === 'WAITING');
    remainingWaiting.sort((a, b) => b.cgpa - a.cgpa);
    for (const item of remainingWaiting) {
      item.rank = currentRank++;
    }

    // 7. Record in Waiting List Movement Log
    if (!run.waitingListMovementLog) {
      run.waitingListMovementLog = [];
    }
    run.waitingListMovementLog.unshift({
      studentRollNumber: candidate.studentRollNumber,
      studentName: candidate.studentName,
      previousRank: prevRank,
      promotedToBlockCode: assignedBed.blockCode,
      promotedToRoomNumber: assignedBed.roomNumber,
      promotedToBedLabel: assignedBed.bedLabel,
      actionType: 'MANUAL_PROMOTION',
      authorizedBy: payload.authorizedBy || 'warden@univ-delhi.ac.in',
      timestamp: new Date(),
    });

    // 8. Update run stats
    run.stats.totalBedsAssigned = run.assignments.length;
    run.stats.waitingListCount = remainingWaiting.length;

    run.auditTrail.push({
      action: 'WAITING_LIST_PROMOTION',
      by: payload.authorizedBy || 'warden@univ-delhi.ac.in',
      at: new Date(),
      reason: `Promoted ${candidate.studentName} (${candidate.studentRollNumber}) from Rank #${prevRank} -> ${assignedBed.blockCode}-${assignedBed.roomNumber}-${assignedBed.bedLabel}.`,
    });

    await run.save();

    this.logger.log(
      `Promoted ${candidate.studentName} (${candidate.studentRollNumber}) to ${assignedBed.blockCode}-${assignedBed.roomNumber}`,
    );

    return {
      promotedStudent: candidate,
      assignedBed: {
        blockCode: assignedBed.blockCode,
        roomNumber: assignedBed.roomNumber,
        bedLabel: assignedBed.bedLabel,
      },
      newWaitingListCount: remainingWaiting.length,
    };
  }

  /**
   * Auto-Promote All Vacancies: Automatically match top waiting students with all available vacant beds
   */
  async autoPromoteAllVacancies(tenantId: string = 'univ-delhi-hostel', authorizedBy: string = 'system@univ-delhi.ac.in') {
    const run = await this.getTargetRun(tenantId);
    const availableBeds = await this.bedModel.find({ tenantId, status: BedStatus.AVAILABLE }).sort({ floor: 1, roomNumber: 1 }).exec();

    const promotions: any[] = [];

    for (const bed of availableBeds) {
      const requiredGender = bed.blockCode === 'GH-01' ? Gender.FEMALE : Gender.MALE;
      const candidate = (run.waitingList || [])
        .filter((e) => e.status === 'WAITING' && e.gender === requiredGender)
        .sort((a, b) => a.rank - b.rank)[0];

      if (!candidate) continue;

      const prevRank = candidate.rank;

      // Lock bed
      bed.status = BedStatus.BOOKED;
      bed.assignedStudentRollNumber = candidate.studentRollNumber;
      bed.assignedStudentName = candidate.studentName;
      await bed.save();

      // Update application
      await this.applicationModel.updateOne(
        {
          tenantId,
          cycleCode: run.cycleCode,
          studentRollNumber: candidate.studentRollNumber,
        },
        {
          $set: {
            status: ApplicationStatus.ALLOCATED,
            allocatedHostelName: bed.blockCode,
            allocatedRoomNumber: bed.roomNumber,
            allocatedBedLabel: bed.bedLabel,
          },
        },
      );

      // Update waitlist entry
      candidate.status = 'PROMOTED';
      candidate.promotedAt = new Date();
      candidate.promotedToBlockCode = bed.blockCode;
      candidate.promotedToRoomNumber = bed.roomNumber;
      candidate.promotedToBedLabel = bed.bedLabel;

      // Add to assignments
      run.assignments.push({
        studentRollNumber: candidate.studentRollNumber,
        studentName: candidate.studentName,
        gender: candidate.gender,
        category: candidate.category,
        isSpeciallyAbled: false,
        cgpa: candidate.cgpa,
        preferenceSatisfied: 1,
        assignedBlockCode: bed.blockCode,
        assignedFloor: bed.floor,
        assignedRoomNumber: bed.roomNumber,
        assignedBedLabel: bed.bedLabel,
        assignedBedId: bed._id.toString(),
        roommates: [],
        compatibilityScore: 85,
        allocationExplanation: `Auto-promoted from Waiting List Rank #${prevRank} into vacant bed.`,
        isOverridden: false,
      });

      // Record in log
      if (!run.waitingListMovementLog) run.waitingListMovementLog = [];
      run.waitingListMovementLog.unshift({
        studentRollNumber: candidate.studentRollNumber,
        studentName: candidate.studentName,
        previousRank: prevRank,
        promotedToBlockCode: bed.blockCode,
        promotedToRoomNumber: bed.roomNumber,
        promotedToBedLabel: bed.bedLabel,
        actionType: 'AUTO_PROMOTION',
        authorizedBy,
        timestamp: new Date(),
      });

      promotions.push({
        student: candidate.studentName,
        roll: candidate.studentRollNumber,
        bed: `${bed.blockCode}-${bed.roomNumber}-${bed.bedLabel}`,
      });
    }

    // Re-rank remaining
    let currentRank = 1;
    const remaining = (run.waitingList || []).filter((e) => e.status === 'WAITING');
    remaining.sort((a, b) => b.cgpa - a.cgpa);
    for (const item of remaining) {
      item.rank = currentRank++;
    }

    run.stats.totalBedsAssigned = run.assignments.length;
    run.stats.waitingListCount = remaining.length;

    await run.save();

    return {
      totalPromoted: promotions.length,
      promotions,
      remainingWaiting: remaining.length,
    };
  }

  /**
   * Release/Cancel Bed: Frees an occupied bed, and optionally auto-promotes the next waitlist candidate
   */
  async releaseBed(
    tenantId: string = 'univ-delhi-hostel',
    payload: {
      blockCode: string;
      roomNumber: string;
      bedLabel: string;
      reason: string;
      releasedBy: string;
      autoPromoteNext?: boolean;
    },
  ) {
    const bed = await this.bedModel.findOne({
      tenantId,
      blockCode: payload.blockCode,
      roomNumber: payload.roomNumber,
      bedLabel: payload.bedLabel,
    }).exec();

    if (!bed) {
      throw new NotFoundException(`Bed ${payload.blockCode}-${payload.roomNumber}-${payload.bedLabel} not found.`);
    }

    const previousStudentRoll = bed.assignedStudentRollNumber;

    // Reset bed
    bed.status = BedStatus.AVAILABLE;
    bed.assignedStudentRollNumber = undefined;
    bed.assignedStudentName = undefined;
    await bed.save();

    let autoPromotionResult: any = null;
    if (payload.autoPromoteNext) {
      autoPromotionResult = await this.autoPromoteAllVacancies(tenantId, payload.releasedBy);
    }

    return {
      releasedBed: `${payload.blockCode}-${payload.roomNumber}-${payload.bedLabel}`,
      previousStudentRoll,
      autoPromoted: autoPromotionResult,
    };
  }

  /**
   * Student Query: Get individual student's real-time waiting list position and forecast
   */
  async getStudentWaitlistStatus(tenantId: string = 'univ-delhi-hostel', rollNumber: string) {
    const run = await this.runModel.findOne({ tenantId }).sort({ createdAt: -1 }).exec();
    if (!run) {
      return { isOnWaitlist: false };
    }

    const entry = (run.waitingList || []).find(
      (e) => e.studentRollNumber.toUpperCase() === rollNumber.toUpperCase(),
    );

    if (!entry) {
      return { isOnWaitlist: false };
    }

    const totalWaitingInPool = (run.waitingList || []).filter(
      (e) => e.status === 'WAITING' && e.gender === entry.gender,
    ).length;

    const myMovementLogs = (run.waitingListMovementLog || []).filter(
      (m) => m.studentRollNumber.toUpperCase() === rollNumber.toUpperCase(),
    );

    return {
      isOnWaitlist: true,
      entry,
      rank: entry.rank,
      totalWaitingInPool,
      status: entry.status,
      promotedDetails:
        entry.status === 'PROMOTED'
          ? {
              promotedAt: entry.promotedAt,
              blockCode: entry.promotedToBlockCode,
              roomNumber: entry.promotedToRoomNumber,
              bedLabel: entry.promotedToBedLabel,
            }
          : null,
      history: myMovementLogs,
    };
  }
}
