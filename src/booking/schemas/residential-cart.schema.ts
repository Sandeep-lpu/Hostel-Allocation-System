import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { BookingType } from '../enums/booking-type.enum';
import { CartStatus } from '../enums/cart-status.enum';

export type ResidentialCartDocument = HydratedDocument<ResidentialCart>;

/**
 * Detailed Financial Breakdown of the Cart Hold
 */
export class PricingBreakdown {
  @Prop({ required: true, default: 0 })
  baseFee: number; // Annual fee for newly selected room category

  @Prop({ required: true, default: 0 })
  previousPaidFee: number; // Credited amount from current allocation (for Hostel Change)

  @Prop({ required: true, default: 0 })
  differentialRoomFee: number; // max(0, baseFee - previousPaidFee)

  @Prop({ required: true, default: 0 })
  laundryFee: number; // 5400 if selected, else 0

  @Prop({ required: true, default: 0 })
  gymFee: number; // 5000 if selected, else 0

  @Prop({ required: true, default: 0 })
  totalPayable: number; // differentialRoomFee + laundryFee + gymFee
}

/**
 * Residential Cart & Bed Hold Schema
 *
 * Models high-concurrency cart reservations, supporting fresh room bookings,
 * room/hostel changes, and add-on service upgrades with automated 10-minute expiry.
 */
@Schema({
  timestamps: true,
  collection: 'residential_carts',
  optimisticConcurrency: true,
})
export class ResidentialCart {
  @Prop({ required: true, trim: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true, index: true })
  academicSession: string;

  @Prop({ required: true, trim: true, index: true })
  studentId: string; // e.g. "2024BCSE101"

  @Prop({
    required: true,
    enum: BookingType,
    default: BookingType.FRESH_ALLOCATION,
  })
  bookingType: BookingType;

  @Prop({ type: Types.ObjectId, ref: 'BedInventory', default: null })
  lockedBedId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'BedInventory', default: null })
  previousBedId?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'RoommateGroup', default: null, index: true })
  groupId?: Types.ObjectId | null;

  @Prop({ required: true, trim: true, uppercase: true })
  selectedCategoryCode: string;

  @Prop({ required: true, trim: true })
  selectedMessCode: string;

  @Prop({ required: true, default: false })
  includeLaundry: boolean;

  @Prop({ required: true, default: false })
  includeGym: boolean;

  @Prop({ required: true, trim: true })
  mobile: string;

  @Prop({ required: true, trim: true, lowercase: true })
  email: string;

  /**
   * Mandatory undertaking declaration:
   * "I hereby undertake to pay the difference in amount, if any, due to the seater change requested by me"
   */
  @Prop({ required: true, default: false })
  undertakingAccepted: boolean;

  @Prop({ type: PricingBreakdown, required: true })
  pricingBreakdown: PricingBreakdown;

  @Prop({
    required: true,
    enum: CartStatus,
    default: CartStatus.HOLD_ACTIVE,
    index: true,
  })
  status: CartStatus;

  @Prop({ required: true, trim: true })
  idempotencyKey: string;

  @Prop({ required: true, index: true })
  expiresAt: Date;

  @Prop({ default: null })
  allotmentSlipUrl?: string | null;

  @Prop({ default: 'PENDING', enum: ['PENDING', 'GENERATING', 'READY', 'FAILED'], index: true })
  documentStatus?: string;

  @Prop({ default: null, index: true })
  qrVerificationHash?: string | null;
}

export const ResidentialCartSchema = SchemaFactory.createForClass(ResidentialCart);

// Indexes for high-speed queries and concurrency lookups
ResidentialCartSchema.index({ tenantId: 1, studentId: 1, status: 1 });
ResidentialCartSchema.index({ idempotencyKey: 1 }, { unique: true });
ResidentialCartSchema.index({ expiresAt: 1, status: 1 });

