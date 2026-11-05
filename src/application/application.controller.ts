import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationStatus } from './schemas/hostel-application.schema';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  /**
   * Get currently active allocation cycle
   */
  @Get('cycles/active')
  async getActiveCycle(@Query('tenantId') tenantId?: string) {
    return this.applicationService.getActiveCycle(tenantId);
  }

  /**
   * List all allocation cycles
   */
  @Get('cycles')
  async getAllCycles(@Query('tenantId') tenantId?: string) {
    return this.applicationService.getAllCycles(tenantId);
  }

  /**
   * Admin: Create or update allocation cycle & eligibility policy
   */
  @Post('cycles')
  async upsertCycle(
    @Body() body: any,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.applicationService.upsertCycle(tenantId, body);
  }

  /**
   * Student: Submit or edit hostel application
   */
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submitApplication(
    @Body() body: any,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.applicationService.submitApplication(tenantId, body);
  }

  /**
   * Student: Get own application by student roll number
   */
  @Get('my-application/:rollNumber')
  async getMyApplication(
    @Param('rollNumber') rollNumber: string,
    @Query('cycleCode') cycleCode?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.applicationService.getApplicationByRollNumber(tenantId, rollNumber, cycleCode);
  }

  /**
   * Admin: Overview metrics and status breakdown
   */
  @Get('metrics')
  async getApplicationMetrics(
    @Query('cycleCode') cycleCode?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.applicationService.getApplicationMetrics(tenantId, cycleCode);
  }

  /**
   * Admin: Get all applications with search, status, gender, and category filters
   */
  @Get()
  async getAllApplications(
    @Query('cycleCode') cycleCode?: string,
    @Query('status') status?: string,
    @Query('gender') gender?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.applicationService.getAllApplications(tenantId, {
      cycleCode,
      status,
      gender,
      category,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
    });
  }

  /**
   * Admin / Warden: Verify, Approve, Reject, or Request missing documents
   */
  @Patch(':applicationId/verify')
  async verifyApplication(
    @Param('applicationId') applicationId: string,
    @Body()
    body: {
      status: ApplicationStatus;
      verificationNotes?: string;
      rejectionReason?: string;
      verifiedBy: string;
      markDocumentsVerified?: boolean;
    },
  ) {
    return this.applicationService.verifyApplication(applicationId, body);
  }
}

