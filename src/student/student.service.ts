import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  StudentProfile,
  StudentProfileDocument,
  CurrentAllocationSnapshot,
} from './schemas/student-profile.schema';

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);

  constructor(
    @InjectModel(StudentProfile.name)
    private readonly profileModel: Model<StudentProfileDocument>,
  ) {}

  /**
   * Find profile by rollNumber (automatically decrypts PII via mongoose-field-encryption plugin)
   */
  async getProfileByRollNumber(
    tenantId: string,
    rollNumber: string,
  ): Promise<StudentProfileDocument> {
    const profile = await this.profileModel.findOne({ tenantId, rollNumber });
    if (!profile) {
      throw new NotFoundException(
        `Student profile with roll number '${rollNumber}' not found for tenant '${tenantId}'`,
      );
    }
    return profile;
  }

  /**
   * Create or update student profile with encrypted fields
   */
  async upsertProfile(
    profileData: Partial<StudentProfile>,
  ): Promise<StudentProfileDocument> {
    const { tenantId, rollNumber } = profileData;
    let profile = await this.profileModel.findOne({ tenantId, rollNumber });

    if (!profile) {
      profile = new this.profileModel(profileData);
    } else {
      Object.assign(profile, profileData);
    }

    return profile.save();
  }

  /**
   * Update student's allocation snapshot upon room booking or hostel/food change
   */
  async updateAllocationSnapshot(
    tenantId: string,
    rollNumber: string,
    snapshot: CurrentAllocationSnapshot,
  ): Promise<StudentProfileDocument> {
    const profile = await this.getProfileByRollNumber(tenantId, rollNumber);
    profile.currentAllocation = snapshot;
    return profile.save();
  }
}
