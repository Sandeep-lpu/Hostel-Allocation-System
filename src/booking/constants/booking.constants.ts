/**
 * Booking Engine Architectural Constants
 */
export const BOOKING_CONSTANTS = {
  KEYS: {
    // String storing active student hold with 10-minute TTL: stores cartId
    STUDENT_HOLD: (tenantId: string, studentId: string) =>
      `booking:student_hold:${tenantId}:${studentId}`,

    // Idempotency guard key
    IDEMPOTENCY: (tenantId: string, idempotencyKey: string) =>
      `booking:idempotency:${tenantId}:${idempotencyKey}`,
  },

  QUEUES: {
    CART_EXPIRY: 'cart-expiry-queue',
  },

  DEFAULTS: {
    CART_HOLD_TTL_SECONDS: 600, // 10 minutes
    CART_HOLD_TTL_MS: 600_000,
    LAUNDRY_FEE: 5400,
    GYM_FEE: 5000,
  },
};

