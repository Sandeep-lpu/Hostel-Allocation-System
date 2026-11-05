import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AllocationCycleDocument = HydratedDocument<AllocationCycle>;

export enum CycleStatus {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

@Schema({ _id: false })
export class RequiredDocumentConfig {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: true })
  mandatory: boolean;
}

@Schema({ _id: false })
export class EligibilityPolicy {
  @Prop({ default: 6.0 })
  minCgpa: number;

  @Prop({ type: [String], default: ['B.Tech', 'M.Tech', 'B.Sc', 'MCA', 'PhD', 'Dual Degree'] })
  eligibleProgrammes: string[];

  @Prop({ type: [Number], default: [1, 2, 3, 4] })
  eligibleYears: number[];

  @Prop({ type: Object, default: { GENERAL: 40, OBC: 27, SC: 15, ST: 7.5, EWS: 10, PWD: 5 } })
  categoryQuotas: Record<string, number>;

  @Prop({ default: true })
  requireDocumentVerification: boolean;
}

@Schema({
  timestamps: true,
  collection: 'allocation_cycles',
})
export class AllocationCycle {
  @Prop({ required: true, default: 'univ-delhi-hostel', index: true })
  tenantId: string;

  @Prop({ required: true, unique: true, index: true })
  cycleCode: string; // e.g. "CYCLE-2026-FALL"

  @Prop({ required: true })
  title: string; // e.g. "Academic Session 2026-27 - Fall Allotment Cycle"

  @Prop({ required: true, default: 'hostel-allotment-2026' })
  academicSession: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true, enum: CycleStatus, default: CycleStatus.ACTIVE, index: true })
  status: CycleStatus;

  @Prop({ type: EligibilityPolicy, default: () => ({}) })
  eligibilityPolicy: EligibilityPolicy;

  @Prop({ default: 0 })
  applicationFee: number;

  @Prop({
    type: [RequiredDocumentConfig],
    default: [
      { id: 'gov_id', name: 'Government Photo ID / Aadhaar Card', mandatory: true },
      { id: 'category_cert', name: 'Category / Income Certificate (if applicable)', mandatory: false },
      { id: 'fitness_cert', name: 'University Medical Fitness Certificate', mandatory: true },
    ],
  })
  requiredDocuments: RequiredDocumentConfig[];
}

export const AllocationCycleSchema = SchemaFactory.createForClass(AllocationCycle);
