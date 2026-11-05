import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AllocationCycle, AllocationCycleSchema } from './schemas/allocation-cycle.schema';
import { HostelApplication, HostelApplicationSchema } from './schemas/hostel-application.schema';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AllocationCycle.name, schema: AllocationCycleSchema },
      { name: HostelApplication.name, schema: HostelApplicationSchema },
    ]),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService, MongooseModule],
})
export class ApplicationModule {}
