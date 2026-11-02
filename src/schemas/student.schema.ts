import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as fieldEncryptionPlugin from 'mongoose-field-encryption';

export type StudentDocument = HydratedDocument<Student>;

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum AllocationStatus {
  PENDING = 'PENDING',
  ALLOCATED = 'ALLOCATED',
  WAITLISTED = 'WAITLISTED',
  CANCELLED = 'CANCELLED',
}

@Schema({
  timestamps: true,
  collection: 'students',
  optimisticConcurrency: true, // Multi-document optimistic locking support
})
export class Student {
  @Prop({ required: true, unique: true, index: true, uppercase: true, trim: true })
  studentId: string;

  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, enum: Gender, index: true })
  gender: Gender;

  // =========================================================================
  // Sensitive PII Encrypted at rest via AES-256-CBC
  // =========================================================================
  @Prop({ required: true })
  nationalId: string;

  @Prop({ required: true })
  guardianPhone: string;

  @Prop({ default: '' })
  medicalNotes: string;

  // =========================================================================
  // Allocation Status & Tracking
  // =========================================================================
  @Prop({
    required: true,
    enum: AllocationStatus,
    default: AllocationStatus.PENDING,
    index: true,
  })
  allocationStatus: AllocationStatus;

  @Prop({ type: Object, default: null })
  allocatedBedInfo?: {
    hostelId: string;
    hostelCode: string;
    roomNumber: string;
    bedNumber: string;
    allocatedAt: Date;
  };
}

export const StudentSchema = SchemaFactory.createForClass(Student);

// Load encryption key and salt from environment variables or safe fallbacks
const encryptionSecret =
  process.env.DB_ENCRYPTION_SECRET || 'b4f89d34e6214a1a9e8712bc90fa72d1';
const encryptionSalt = process.env.DB_ENCRYPTION_SALT || '8c7e9a01f4b23d5e';

// Attach mongoose-field-encryption plugin for AES-256-CBC encryption at rest
const plugin =
  (fieldEncryptionPlugin as any).fieldEncryption || fieldEncryptionPlugin;

StudentSchema.plugin(plugin, {
  fields: ['nationalId', 'guardianPhone', 'medicalNotes'],
  secret: encryptionSecret,
  salt: encryptionSalt,
});
