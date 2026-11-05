import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Gender } from '../../inventory/enums/gender.enum';

export type AllocationRunDocument = HydratedDocument<AllocationRun>;

export enum AllocationRunStatus {
  DRAFT_GENERATED = 'DRAFT_GENERATED',
  PENDING_WARDEN_REVIEW = 'PENDING_WARDEN_REVIEW',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

@Schema({ _id: false })
export class RoommateBrief {
  @Prop({ required: true })
  rollNumber: string;

  @Prop({ required: true })
  name: string;
}

@Schema({ _id: false })
export class StudentAssignment {
  @Prop({ required: true, uppercase: true })
  studentRollNumber: string;

  @Prop({ required: true })
  studentName: string;

  @Prop({ required: true, enum: Gender })
  gender: Gender;

  @Prop({ required: true })
  category: string;

  @Prop({ default: false })
  isSpeciallyAbled: boolean;

  @Prop({ required: true })
  cgpa: number;

  @Prop({ required: true })
  preferenceSatisfied: number; // 1, 2, 3 or -1 (system fallback)

  @Prop({ required: true })
  assignedBlockCode: string; // e.g. "BH-01"

  @Prop({ required: true })
  assignedFloor: number; // 1 to 6

  @Prop({ required: true })
  assignedRoomNumber: string; // e.g. "R-100"

  @Prop({ required: true })
  assignedBedLabel: string; // e.g. "Bed A"

  @Prop({ required: true })
  assignedBedId: string;

  @Prop({ type: [RoommateBrief], default: [] })
  roommates: RoommateBrief[];

  @Prop({ default: 85 })
  compatibilityScore: number; // 0 to 100%

  @Prop({ required: true })
  allocationExplanation: string; // Detailed human-readable transparent explanation
}

@Schema({ _id: false })
export class WaitingListEntry {
  @Prop({ required: true })
  rank: number;

  @Prop({ required: true, uppercase: true })
  studentRollNumber: string;

  @Prop({ required: true })
  studentName: string;

  @Prop({ required: true })
  cgpa: number;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  reason: string;
}

@Schema({ _id: false })
export class AllocationRunStats {
  @Prop({ default: 0 })
  totalEligibleStudents: number;

  @Prop({ default: 0 })
  totalBedsAssigned: number;

  @Prop({ default: 0 })
  preference1Satisfied: number;

  @Prop({ default: 0 })
  preference2Satisfied: number;

  @Prop({ default: 0 })
  preference3Satisfied: number;

  @Prop({ default: 0 })
  preferenceSatisfactionRate: number; // %

  @Prop({ default: 0 })
  averageCompatibilityScore: number; // %

  @Prop({ default: 0 })
  waitingListCount: number;
}

@Schema({ _id: false })
export class AllocationAuditEntry {
  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  by: string;

  @Prop({ default: () => new Date() })
  at: Date;

  @Prop({ default: '' })
  reason: string;
}

@Schema({
  timestamps: true,
  collection: 'allocation_runs',
})
export class AllocationRun {
  @Prop({ required: true, default: 'univ-delhi-hostel', index: true })
  tenantId: string;

  @Prop({ required: true, unique: true, index: true })
  runId: string; // e.g. "RUN-2026-001"

  @Prop({ required: true, index: true })
  cycleCode: string; // e.g. "CYCLE-2026-FALL"

  @Prop({ required: true, default: 'hostel-allotment-2026' })
  academicSession: string;

  @Prop({ required: true, default: 42 })
  randomSeed: number; // Seed stored for 100% reproducible re-runs

  @Prop({
    required: true,
    enum: AllocationRunStatus,
    default: AllocationRunStatus.DRAFT_GENERATED,
    index: true,
  })
  status: AllocationRunStatus;

  @Prop({ type: AllocationRunStats, default: () => ({}) })
  stats: AllocationRunStats;

  @Prop({ type: [StudentAssignment], default: [] })
  assignments: StudentAssignment[];

  @Prop({ type: [WaitingListEntry], default: [] })
  waitingList: WaitingListEntry[];

  @Prop({ type: [AllocationAuditEntry], default: [] })
  auditTrail: AllocationAuditEntry[];
}

export const AllocationRunSchema = SchemaFactory.createForClass(AllocationRun);
