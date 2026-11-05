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

@Controller('allocation')
export class AllocationController {
  constructor(private readonly allocationService: AllocationEngineService) {}

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
}
