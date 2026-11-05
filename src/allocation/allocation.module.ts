import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { AllocationRun, AllocationRunSchema } from './schemas/allocation-run.schema';
import { RoommateProfile, RoommateProfileSchema } from './schemas/roommate-profile.schema';
import {
  HostelApplication,
  HostelApplicationSchema,
} from '../application/schemas/hostel-application.schema';
import {
  AllocationCycle,
  AllocationCycleSchema,
} from '../application/schemas/allocation-cycle.schema';
import { BedInventory, BedInventorySchema } from '../inventory/schemas/bed-inventory.schema';
import { AllocationEngineService } from './services/allocation-engine.service';
import { WaitingListService } from './services/waiting-list.service';
import { AllocationController } from './allocation.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AllocationRun.name, schema: AllocationRunSchema },
      { name: RoommateProfile.name, schema: RoommateProfileSchema },
      { name: HostelApplication.name, schema: HostelApplicationSchema },
      { name: AllocationCycle.name, schema: AllocationCycleSchema },
      { name: BedInventory.name, schema: BedInventorySchema },
    ]),
    BullModule.registerQueue({
      name: process.env.ALLOCATION_QUEUE_NAME || 'allocation-job-queue',
    }),
  ],
  controllers: [AllocationController],
  providers: [AllocationEngineService, WaitingListService],
  exports: [AllocationEngineService, WaitingListService, MongooseModule],
})
export class AllocationModule {}
