import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AllocationEngineService } from './services/allocation-engine.service';
import { WaitingListService } from './services/waiting-list.service';

@Controller('allocation')
export class AllocationController {
  constructor(
    private readonly allocationService: AllocationEngineService,
    private readonly waitingListService: WaitingListService,
  ) {}

  /**
   * Start new allocation run (Deterministic, seed-based)
   */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runAllocation(
    @Body()
    body: {
      cycleCode: string;
      randomSeed?: number;
      initiatedBy?: string;
    },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.allocationService.runAllocationEngine(
      tenantId,
      body.cycleCode,
      body.randomSeed !== undefined ? Number(body.randomSeed) : 42,
      body.initiatedBy || 'Admin Allocation Officer',
    );
  }

  /**
   * List all allocation runs
   */
  @Get('runs')
  async getAllRuns(@Query('tenantId') tenantId?: string) {
    return this.allocationService.getAllRuns(tenantId);
  }

  /**
   * Get specific run by runId
   */
  @Get('runs/:runId')
  async getRunById(
    @Param('runId') runId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.allocationService.getRunById(tenantId, runId);
  }

  /**
   * Get latest allocation draft or published result (Student Portal)
   */
  @Get('latest')
  async getLatestAllocation(@Query('tenantId') tenantId?: string) {
    return this.allocationService.getLatestPublishedAllocation(tenantId);
  }

  /**
   * Student: Submit or update Roommate Compatibility Questionnaire
   */
  @Post('roommate-questionnaire')
  @HttpCode(HttpStatus.OK)
  async submitQuestionnaire(
    @Body() body: any,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.allocationService.upsertRoommateProfile(tenantId, body);
  }

  /**
   * Student: Get own Roommate Compatibility Questionnaire
   */
  @Get('roommate-questionnaire/:rollNumber')
  async getQuestionnaire(
    @Param('rollNumber') rollNumber: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.allocationService.getRoommateProfile(tenantId, rollNumber);
  }

  /**
   * Warden Governance: Submit draft run for Warden Review
   */
  @Post('runs/:runId/submit-review')
  @HttpCode(HttpStatus.OK)
  async submitForWardenReview(
    @Param('runId') runId: string,
    @Body() body: { submittedBy?: string },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.allocationService.submitForWardenReview(
      tenantId,
      runId,
      body.submittedBy || 'admin@univ-delhi.ac.in',
    );
  }

  /**
   * Warden Governance: Manual override student room/bed assignment with mandatory reason
   */
  @Post('runs/:runId/override')
  @HttpCode(HttpStatus.OK)
  async overrideAssignment(
    @Param('runId') runId: string,
    @Body()
    body: {
      studentRollNumber: string;
      targetBlockCode: string;
      targetFloor?: number;
      targetRoomNumber: string;
      targetBedLabel: string;
      overrideReason: string;
      wardenEmail: string;
    },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.allocationService.overrideStudentAssignment(tenantId, runId, body);
  }

  /**
   * Warden Governance: Formally approve allocation draft
   */
  @Post('runs/:runId/approve')
  @HttpCode(HttpStatus.OK)
  async approveAllocation(
    @Param('runId') runId: string,
    @Body() body: { wardenEmail: string; approvalNotes?: string },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.allocationService.approveAllocation(tenantId, runId, body);
  }

  /**
   * Warden Governance: Reject draft and send back for corrections
   */
  @Post('runs/:runId/reject')
  @HttpCode(HttpStatus.OK)
  async rejectAllocation(
    @Param('runId') runId: string,
    @Body() body: { wardenEmail: string; rejectionReason: string },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.allocationService.rejectAllocation(tenantId, runId, body);
  }

  /**
   * Warden Governance: Authorized final publication
   * Enforces mandatory approval state machine rule
   */
  @Post('runs/:runId/publish')
  @HttpCode(HttpStatus.OK)
  async publishAllocation(
    @Param('runId') runId: string,
    @Body() body: { publishedBy: string; publishNotes?: string },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.allocationService.publishAllocation(tenantId, runId, body);
  }

  /**
   * Get override history for an allocation run
   */
  @Get('runs/:runId/overrides')
  async getOverrides(
    @Param('runId') runId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.allocationService.getOverrideHistory(tenantId, runId);
  }

  // ==========================================
  // PHASE 5: WAITING LIST & AUTO-PROMOTION
  // ==========================================

  /**
   * Admin/Warden: Get Active Waiting List with priority rankings & movement log
   */
  @Get('waiting-list')
  async getWaitingList(
    @Query('runId') runId?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.waitingListService.getWaitingList(tenantId, runId);
  }

  /**
   * Admin/Warden: Track Real-Time Bed Vacancies
   */
  @Get('waiting-list/vacancies')
  async getAvailableVacancies(
    @Query('blockCode') blockCode?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.waitingListService.getAvailableVacancies(tenantId, blockCode);
  }

  /**
   * Student Portal: Real-time Waiting List Position & Vacancy Forecast
   */
  @Get('waiting-list/status/:rollNumber')
  async getStudentWaitlistStatus(
    @Param('rollNumber') rollNumber: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.waitingListService.getStudentWaitlistStatus(tenantId, rollNumber);
  }

  /**
   * Admin/Warden: Promote specific waiting student into a vacant bed
   */
  @Post('waiting-list/promote')
  @HttpCode(HttpStatus.OK)
  async promoteStudent(
    @Body()
    body: {
      runId?: string;
      studentRollNumber: string;
      targetBlockCode?: string;
      targetRoomNumber?: string;
      targetBedLabel?: string;
      authorizedBy: string;
    },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.waitingListService.promoteStudent(tenantId, body);
  }

  /**
   * Admin/Warden: 1-Click Auto-Promote All Vacancies sequentially
   */
  @Post('waiting-list/auto-promote')
  @HttpCode(HttpStatus.OK)
  async autoPromoteAll(
    @Body() body: { authorizedBy?: string },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.waitingListService.autoPromoteAllVacancies(
      tenantId,
      body.authorizedBy || 'warden@univ-delhi.ac.in',
    );
  }

  /**
   * Admin/Warden: Release / Cancel occupied bed (triggers vacancy)
   */
  @Post('waiting-list/release-bed')
  @HttpCode(HttpStatus.OK)
  async releaseBed(
    @Body()
    body: {
      blockCode: string;
      roomNumber: string;
      bedLabel: string;
      reason: string;
      releasedBy: string;
      autoPromoteNext?: boolean;
    },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.waitingListService.releaseBed(tenantId, body);
  }
}
