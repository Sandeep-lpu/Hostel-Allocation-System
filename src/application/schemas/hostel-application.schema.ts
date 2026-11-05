import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Gender } from '../../inventory/enums/gender.enum';

export type HostelApplicationDocument = HydratedDocument<HostelApplication>;

export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  ALLOCATED = 'ALLOCATED',
  REJECTED = 'REJECTED',
  ACTION_REQUIRED = 'ACTION_REQUIRED',
}

@Schema({ _id: false })
export class RankedPreference {
  @Prop({ required: true })
  preferenceRank: number; // 1, 2, 3

  @Prop({ required: true })
  blockCode: string; // e.g. "BH-01" or "GH-01"

  @Prop({ required: true })
  categoryCode: string; // e.g. "STUDIO_AC_2S_PANTRY", "STD_AC_2S"
}

@Schema({ _id: false })
export class ApplicationDocument {
  @Prop({ required: true })
  documentId: string; // e.g. "gov_id"

  @Prop({ required: true })
  documentName: string;

  @Prop({ required: true })
  fileUrl: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ default: () => new Date() })
  uploadedAt: Date;
}

@Schema({ _id: false })
export class EligibilityResult {
  @Prop({ default: true })
  cgpaPassed: boolean;

  @Prop({ default: true })
  programmePassed: boolean;

  @Prop({ default: false })
  documentsPassed: boolean;

  @Prop({ default: true })
  feeCategoryPassed: boolean;

  @Prop({ default: false })
  isOverallEligible: boolean;

  @Prop({ default: '' })
  summary: string;
}

@Schema({
  timestamps: true,
  collection: 'hostel_applications',
})
export class HostelApplication {
  @Prop({ required: true, default: 'univ-delhi-hostel', index: true })
  tenantId: string;

  @Prop({ required: true, unique: true, index: true })
  applicationNumber: string; // e.g. "APP-2026-1024"

  @Prop({ required: true, index: true })
  cycleCode: string; // e.g. "CYCLE-2026-FALL"

  @Prop({ required: true, index: true, uppercase: true })
  studentRollNumber: string;

  @Prop({ required: true })
  studentName: string;

  @Prop({ required: true, enum: Gender, index: true })
  gender: Gender;

  @Prop({ required: true })
  course: string; // e.g. "B.Tech Computer Science"

  @Prop({ required: true, default: 2 })
  yearOfStudy: number;

  @Prop({ required: true, default: 8.0 })
  cgpa: number;

  @Prop({ required: true, default: 'GENERAL' })
  category: string; // "GENERAL" | "OBC" | "SC" | "ST" | "EWS" | "PWD"

  @Prop({ required: true, default: 'REGULAR' })
  feeCategory: string; // "REGULAR" | "CONCESSION" | "SCHOLARSHIP"

  @Prop({ default: false })
  isSpeciallyAbled: boolean;

  @Prop({ required: true })
  guardianName: string;

  @Prop({ required: true })
  guardianMobile: string;

  @Prop({ required: true, default: 'Parent' })
  guardianRelation: string;

  @Prop({ required: true })
  emergencyContact: string;

  @Prop({ default: '' })
  address: string;

  @Prop({ type: [RankedPreference], default: [] })
  preferences: RankedPreference[];

  @Prop({ type: [ApplicationDocument], default: [] })
  documents: ApplicationDocument[];

  @Prop({
    required: true,
    enum: ApplicationStatus,
    default: ApplicationStatus.SUBMITTED,
    index: true,
  })
  status: ApplicationStatus;

  @Prop({ default: '' })
  verificationNotes: string;

  @Prop({ default: '' })
  rejectionReason: string;

  @Prop({ default: '' })
  verifiedBy: string; // Warden / Admin Name

  @Prop({ default: null })
  verifiedAt: Date | null;

  @Prop({ type: EligibilityResult, default: () => ({}) })
  eligibilityResult: EligibilityResult;
}

export const HostelApplicationSchema = SchemaFactory.createForClass(HostelApplication);

HostelApplicationSchema.index({ tenantId: 1, cycleCode: 1, studentRollNumber: 1 }, { unique: true });

