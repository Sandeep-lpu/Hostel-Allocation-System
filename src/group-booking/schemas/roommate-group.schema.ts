import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Gender } from '../../inventory/enums/gender.enum';
import { GroupStatus } from '../enums/group-status.enum';
import { MemberStatus } from '../enums/member-status.enum';

export type RoommateGroupDocument = HydratedDocument<RoommateGroup>;

/**
 * Individual Roommate Group Member Subdocument
 */
@Schema({ _id: false })
export class GroupMember {
  @Prop({ required: true, trim: true })
  studentId: string; // e.g. "2024BCSE101"

  @Prop({ required: true, trim: true, uppercase: true })
  rollNumber: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    enum: MemberStatus,
    default: MemberStatus.INVITED,
  })
  status: MemberStatus;

  @Prop({ required: true, default: Date.now })
  joinedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'ResidentialCart', default: null })
  cartId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'BedInventory', default: null })
  allocatedBedId?: Types.ObjectId | null;

  @Prop({ default: null })
  allocatedRoom?: string | null;

  @Prop({ default: null })
  allocatedBedLabel?: string | null;
}

export const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);

/**
 * Coordinated Friend / Roommate Group Schema
 *
 * Distributed Protocol Rationale:
 * Enforces atomic co-location for 2-4 friends, requiring mutual consent,
 * uniform gender isolation, and joint queue entry while allowing individual split cart payments.
 */
@Schema({
  timestamps: true,
  collection: 'roommate_groups',
  optimisticConcurrency: true,
})
export class RoommateGroup {
  @Prop({ required: true, trim: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true, index: true })
  academicSession: string;

  @Prop({ required: true, trim: true, uppercase: true })
  groupCode: string; // e.g. "GRP-9021"

  @Prop({ required: true, trim: true, index: true })
  leaderStudentId: string;

  @Prop({ required: true, enum: Gender })
  gender: Gender;

  @Prop({ required: true, min: 2, max: 4 })
  targetSeater: number; // 2, 3, or 4

  @Prop({ required: true, trim: true, uppercase: true })
  categoryCode: string; // e.g. "STD_AC_4S", "STUDIO_AC_3S_PANTRY"

  @Prop({ type: [GroupMemberSchema], default: [] })
  members: GroupMember[];

  @Prop({
    required: true,
    enum: GroupStatus,
    default: GroupStatus.FORMING,
    index: true,
  })
  status: GroupStatus;

  @Prop({ default: '' })
  allocatedBlockCode: string;

  @Prop({ type: [String], default: [] })
  allocatedRoomNumbers: string[];

  @Prop({ default: null })
  holdExpiresAt?: Date | null;

  @Prop({ default: 0 })
  version: number;
}

export const RoommateGroupSchema = SchemaFactory.createForClass(RoommateGroup);

// Indexes
RoommateGroupSchema.index(
  { tenantId: 1, academicSession: 1, groupCode: 1 },
  { unique: true },
);
RoommateGroupSchema.index({
  tenantId: 1,
  academicSession: 1,
  'members.studentId': 1,
  status: 1,
});
RoommateGroupSchema.index({
  tenantId: 1,
  academicSession: 1,
  leaderStudentId: 1,
  status: 1,
});

