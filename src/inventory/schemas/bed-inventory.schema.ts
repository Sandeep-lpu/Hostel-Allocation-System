import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BedStatus } from '../enums/bed-status.enum';

export type BedInventoryDocument = HydratedDocument<BedInventory>;

/**
 * Normalized Atomic Bed Inventory Unit
 *
 * Distributed Systems Rationale:
 * De-embedding beds from a single monolithic Hostel document eliminates MongoDB document-level
 * write-lock contention under 10,000+ concurrent allocations.
 * Each bed document is an independent lockable resource with optimistic concurrency control.
 */
@Schema({
  timestamps: true,
  collection: 'bed_inventories',
  optimisticConcurrency: true,
})
export class BedInventory {
  @Prop({ required: true, trim: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true, index: true })
  academicSession: string;

  @Prop({ required: true, trim: true, uppercase: true })
  blockCode: string; // e.g. "BH-01"

  @Prop({ required: true })
  floor: number; // e.g. 6

  @Prop({ required: true, trim: true, uppercase: true })
  roomNumber: string; // e.g. "A619"

  @Prop({ required: true, trim: true })
  bedLabel: string; // e.g. "Bed C", "Bed A"

  @Prop({ required: true, trim: true, uppercase: true })
  categoryCode: string; // e.g. "STUDIO_AC_3S_PANTRY"

  @Prop({
    required: true,
    enum: BedStatus,
    default: BedStatus.AVAILABLE,
    index: true,
  })
  status: BedStatus;

  @Prop({ type: Types.ObjectId, ref: 'StudentProfile', default: null })
  allocatedTo?: Types.ObjectId | null;

  @Prop({ default: null, index: true })
  lockExpiresAt?: Date | null;

  @Prop({ default: 0 })
  version: number;
}

export const BedInventorySchema = SchemaFactory.createForClass(BedInventory);

// 1. Compound Unique Index: Prevents duplicate bed entries in the entire campus
BedInventorySchema.index(
  { tenantId: 1, academicSession: 1, blockCode: 1, roomNumber: 1, bedLabel: 1 },
  { unique: true },
);

// 2. High-speed Availability Lookup Index for Cache Aggregation & Live Counters
BedInventorySchema.index({
  tenantId: 1,
  academicSession: 1,
  categoryCode: 1,
  status: 1,
});

// 3. Room & Floor Lookup Index for Detailed Room Views
BedInventorySchema.index({
  tenantId: 1,
  academicSession: 1,
  blockCode: 1,
  categoryCode: 1,
  status: 1,
});
