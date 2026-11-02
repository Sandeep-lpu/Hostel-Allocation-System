import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Gender } from '../enums/gender.enum';

export type HostelBlockDocument = HydratedDocument<HostelBlock>;

/**
 * Normalized Hostel Block Schema
 * Represents physical residence towers/blocks partitioned by gender and campus tenant.
 */
@Schema({
  timestamps: true,
  collection: 'hostel_blocks',
})
export class HostelBlock {
  @Prop({ required: true, trim: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true, uppercase: true })
  blockCode: string; // e.g. "BH-01", "GH-02"

  @Prop({ required: true, trim: true })
  blockName: string; // e.g. "Boys Hostel-01"

  @Prop({ required: true, enum: Gender, index: true })
  gender: Gender;

  @Prop({ required: true, trim: true })
  defaultMessName: string; // e.g. "Same Hostel Mess 1 (BH-01)"
}

export const HostelBlockSchema = SchemaFactory.createForClass(HostelBlock);

// Enforce unique block codes per tenant
HostelBlockSchema.index({ tenantId: 1, blockCode: 1 }, { unique: true });
HostelBlockSchema.index({ tenantId: 1, gender: 1 });
