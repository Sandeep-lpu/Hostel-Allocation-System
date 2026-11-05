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
}
