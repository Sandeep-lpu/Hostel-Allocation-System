import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoomCategoryDocument = HydratedDocument<RoomCategory>;

/**
 * Normalized Room Category Configuration Schema
 * Defines seat pricing, amenities, room layout, and inventory alerting thresholds.
 */
@Schema({
  timestamps: true,
  collection: 'room_categories',
})
export class RoomCategory {
  @Prop({ required: true, trim: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true, index: true })
  academicSession: string;

  @Prop({ required: true, trim: true, uppercase: true })
  categoryCode: string; // e.g. STUDIO_AC_3S_PANTRY, STD_AC_2S

  @Prop({ required: true, trim: true })
  roomType: string; // e.g. "Studio Apartment Air Conditioned", "Standard Air Conditioned"

  @Prop({ required: true, trim: true, default: 'Attached Washroom' })
  washroomType: string;

  @Prop({ required: true, min: 1, max: 10 })
  seaterCount: number; // 2, 3, 4 Seater

  @Prop({ required: true, default: false })
  hasPantry: boolean;

  @Prop({ required: true, min: 0 })
  annualFee: number; // e.g. 150000, 130000, 103000

  @Prop({ required: true, default: 20 })
  lowSeatThreshold: number; // For "LIMITED_SEATS_LEFT" dynamic badge
}

export const RoomCategorySchema = SchemaFactory.createForClass(RoomCategory);

// Compound Unique Index to enforce multi-tenant category isolation
RoomCategorySchema.index(
  { tenantId: 1, academicSession: 1, categoryCode: 1 },
  { unique: true },
);
RoomCategorySchema.index({ tenantId: 1, academicSession: 1, seaterCount: 1 });
