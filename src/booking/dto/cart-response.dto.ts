import { BookingType } from '../enums/booking-type.enum';
import { CartStatus } from '../enums/cart-status.enum';
import { PricingBreakdown } from '../schemas/residential-cart.schema';

export interface LockedBedSummary {
  bedId: string;
  blockCode: string;
  floor: number;
  roomNumber: string;
  bedLabel: string;
  categoryCode: string;
}

export interface CartResponseDto {
  cartId: string;
  tenantId: string;
  academicSession: string;
  studentId: string;
  bookingType: BookingType;
  status: CartStatus;
  lockedBed: LockedBedSummary | null;
  previousBedId?: string | null;
  selectedCategoryCode: string;
  selectedMessCode: string;
  includeLaundry: boolean;
  includeGym: boolean;
  pricingBreakdown: PricingBreakdown;
  expiresAt: Date;
  remainingSeconds: number;
  undertakingAccepted: boolean;
  idempotencyKey: string;
  createdAt: Date;
}

