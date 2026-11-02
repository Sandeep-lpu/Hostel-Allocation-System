import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { ServiceType } from '../enums/service-type.enum';

export type AncillaryServiceDocument = HydratedDocument<AncillaryService>;

/**
 * Normalized Ancillary Service Schema
 * Configures optional or mandatory add-on services: Mess plans, Laundry packages, and Gym memberships.
 */
@Schema({
  timestamps: true,
  collection: 'ancillary_services',
})
export class AncillaryService {
  @Prop({ required: true, trim: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true, uppercase: true })
  serviceCode: string; // e.g. "MESS_NORTH_3M", "LAUNDRY_ANNUAL", "GYM_ANNUAL"

  @Prop({ required: true, enum: ServiceType, index: true })
  serviceType: ServiceType; // MESS, LAUNDRY, GYM

  @Prop({ required: true, trim: true })
  title: string; // e.g. "Standard Mess Three Meals - North Indian Exclusive"

  @Prop({ required: true, min: 0 })
  fee: number; // e.g. 5400, 5000

  @Prop({ required: true, default: false })
  isMandatory: boolean;
}

export const AncillaryServiceSchema = SchemaFactory.createForClass(AncillaryService);

AncillaryServiceSchema.index({ tenantId: 1, serviceCode: 1 }, { unique: true });
AncillaryServiceSchema.index({ tenantId: 1, serviceType: 1 });
