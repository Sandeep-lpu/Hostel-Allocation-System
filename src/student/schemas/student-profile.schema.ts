import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as fieldEncryptionPlugin from 'mongoose-field-encryption';
import { Gender } from '../../inventory/enums/gender.enum';

export type StudentProfileDocument = HydratedDocument<StudentProfile>;

/**
 * Snapshot of existing allocation for Hostel / Room / Mess Change workflows
 */
export class CurrentAllocationSnapshot {
  @Prop({ type: Types.ObjectId, ref: 'HostelBlock', default: null })
  hostelId?: Types.ObjectId | null;

  @Prop({ default: '' })
  blockCode: string; // e.g. "BH-01"

  @Prop({ default: '' })
  roomNumber: string; // e.g. "A619"

  @Prop({ default: '' })
  bedLabel: string; // e.g. "Bed C"

  @Prop({ default: 0 })
  seaterCount: number;

  @Prop({ default: '' })
  categoryCode: string;

  @Prop({ default: '' })
  messService: string;

  @Prop({ default: '' })
  laundryService: string;

  @Prop({ default: '' })
  gymService: string;

  @Prop({ default: null })
  allocatedAt?: Date | null;
}

/**
 * Student Profile Schema with AES-256-CBC Field Encryption
 *
 * Privacy & Compliance Rationale:
 * Student national identifiers (Aadhaar / Passport), emergency guardian phone numbers,
 * and sensitive medical notes are encrypted at rest via AES-256-CBC to comply with
 * DPDP / GDPR data protection mandates.
 */
@Schema({
  timestamps: true,
  collection: 'student_profiles',
  optimisticConcurrency: true,
})
export class StudentProfile {
  @Prop({ required: true, trim: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true, uppercase: true })
  rollNumber: string; // e.g. "2024BCSE101"

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: Gender, index: true })
  gender: Gender;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, trim: true })
  mobile: string;

  @Prop({ type: CurrentAllocationSnapshot, default: () => ({}) })
  currentAllocation: CurrentAllocationSnapshot;

  // =========================================================================
  // Sensitive PII Encrypted at rest via AES-256-CBC
  // =========================================================================
  @Prop({ required: true })
  nationalId: string;

  @Prop({ required: true })
  guardianMobile: string;

  @Prop({ default: '' })
  medicalConditions: string;
}

export const StudentProfileSchema = SchemaFactory.createForClass(StudentProfile);

// Enforce unique roll number per tenant
StudentProfileSchema.index({ tenantId: 1, rollNumber: 1 }, { unique: true });
StudentProfileSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Load encryption key and salt from environment variables or safe fallbacks
const encryptionSecret =
  process.env.DB_ENCRYPTION_SECRET || 'b4f89d34e6214a1a9e8712bc90fa72d1';
const encryptionSalt = process.env.DB_ENCRYPTION_SALT || '8c7e9a01f4b23d5e';

// Attach mongoose-field-encryption plugin for AES-256-CBC encryption at rest
const plugin =
  (fieldEncryptionPlugin as any).fieldEncryption || fieldEncryptionPlugin;

StudentProfileSchema.plugin(plugin, {
  fields: ['nationalId', 'guardianMobile', 'medicalConditions'],
  secret: encryptionSecret,
  salt: encryptionSalt,
});
