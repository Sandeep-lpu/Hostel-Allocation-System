/**
 * Residential Cart Lifecycle Status
 */
export enum CartStatus {
  /**
   * Bed is temporarily locked in the student's cart (10-minute hold active)
   */
  HOLD_ACTIVE = 'HOLD_ACTIVE',

  /**
   * Student has redirected to payment gateway (hold maintained)
   */
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',

  /**
   * Payment confirmed and bed definitively allocated
   */
  CONFIRMED = 'CONFIRMED',

  /**
   * 10-minute hold timed out without payment confirmation; bed auto-released
   */
  EXPIRED = 'EXPIRED',

  /**
   * Student voluntarily released the bed hold to choose another room
   */
  CANCELLED = 'CANCELLED',
}

