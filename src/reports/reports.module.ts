import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AllocationRun, AllocationRunSchema } from '../allocation/schemas/allocation-run.schema';
import { BedInventory, BedInventorySchema } from '../inventory/schemas/bed-inventory.schema';
import { HostelApplication, HostelApplicationSchema } from '../application/schemas/hostel-application.schema';
import { Announcement, AnnouncementSchema } from './schemas/announcement.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AllocationRun.name, schema: AllocationRunSchema },
      { name: BedInventory.name, schema: BedInventorySchema },
      { name: HostelApplication.name, schema: HostelApplicationSchema },
      { name: Announcement.name, schema: AnnouncementSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

