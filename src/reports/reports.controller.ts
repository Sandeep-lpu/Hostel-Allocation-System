import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Header,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { FastifyReply } from 'fastify';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Executive BI Analytics & Summary Data
   */
  @Get('summary')
  async getSummary(@Query('tenantId') tenantId?: string) {
    return this.reportsService.getExecutiveSummary(tenantId);
  }

  /**
   * Download Allocations Master CSV
   */
  @Get('export/allocations.csv')
  async exportAllocations(
    @Res() reply: FastifyReply,
    @Query('tenantId') tenantId?: string,
  ) {
    const csv = await this.reportsService.generateAllocationsCsv(tenantId);
    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="hostel_allocations_master.csv"')
      .send(csv);
  }

  /**
   * Download Bed Inventory Status CSV
   */
  @Get('export/inventory.csv')
  async exportInventory(
    @Res() reply: FastifyReply,
    @Query('tenantId') tenantId?: string,
  ) {
    const csv = await this.reportsService.generateInventoryCsv(tenantId);
    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="hostel_bed_inventory.csv"')
      .send(csv);
  }

  /**
   * Download Waiting List Priority CSV
   */
  @Get('export/waiting-list.csv')
  async exportWaitingList(
    @Res() reply: FastifyReply,
    @Query('tenantId') tenantId?: string,
  ) {
    const csv = await this.reportsService.generateWaitingListCsv(tenantId);
    reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="waiting_list_priority.csv"')
      .send(csv);
  }

  /**
   * List announcements
   */
  @Get('announcements')
  async getAnnouncements(@Query('tenantId') tenantId?: string) {
    return this.reportsService.getAnnouncements(tenantId);
  }

  /**
   * Broadcast announcement
   */
  @Post('announcements')
  @HttpCode(HttpStatus.OK)
  async createAnnouncement(
    @Body()
    body: {
      title: string;
      content: string;
      category?: string;
      targetAudience?: string;
      publishedBy?: string;
    },
    @Query('tenantId') tenantId?: string,
  ) {
    return this.reportsService.createAnnouncement(tenantId, body);
  }
}

