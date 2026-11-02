import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StudentProfile, StudentProfileSchema } from './schemas/student-profile.schema';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { WaitingRoomModule } from '../waiting-room/waiting-room.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StudentProfile.name, schema: StudentProfileSchema },
    ]),
    WaitingRoomModule,
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService, MongooseModule],
})
export class StudentModule {}
