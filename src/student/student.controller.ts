import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { AdmissionPassGuard } from '../waiting-room/guards/admission-pass.guard';
import { StudentProfile } from './schemas/student-profile.schema';

@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  /**
   * Fetch authenticated student profile and existing allocation snapshot
   */
  @Get(':rollNumber')
  @UseGuards(AdmissionPassGuard)
  async getProfile(
    @Param('rollNumber') rollNumber: string,
    @Query('tenantId') tenantId: string = 'univ-delhi-hostel',
  ) {
    return this.studentService.getProfileByRollNumber(tenantId, rollNumber);
  }

  /**
   * Register or update student profile (PII fields nationalId, guardianMobile are AES encrypted)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Body() body: Partial<StudentProfile>) {
    return this.studentService.upsertProfile(body);
  }
}
