import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { Student, StudentSchema } from '../schemas/student.schema';
import { Hostel, HostelSchema } from '../schemas/hostel.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Student.name, schema: StudentSchema },
      { name: Hostel.name, schema: HostelSchema },
    ]),
    BullModule.registerQueue({
      name: process.env.ALLOCATION_QUEUE_NAME || 'allocation-job-queue',
    }),
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class AllocationModule {}
