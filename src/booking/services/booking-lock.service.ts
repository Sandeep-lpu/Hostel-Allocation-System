import {
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { VwrRedisService } from '../../waiting-room/redis/redis.service';
import { BOOKING_CONSTANTS } from '../constants/booking.constants';
import { INVENTORY_CONSTANTS } from '../../inventory/constants/inventory.constants';

export const ATOMIC_ACQUIRE_BOOKING_LOCK_LUA = `
-- KEYS[1]: booking:student_hold:{tenantId}:{studentId}
-- KEYS[2]: booking:idempotency:{tenantId}:{idempotencyKey}
-- KEYS[3]: inv:counts:{tenantId}:{sessionId}

-- ARGV[1]: categoryCode
-- ARGV[2]: ttlSeconds (600)
-- ARGV[3]: lockVal (e.g. cartId or pending)

-- Step 1: Idempotency check FIRST (Same student re-submitting same key returns existing hold)
if redis.call('EXISTS', KEYS[2]) == 1 then
    local cachedVal = redis.call('GET', KEYS[2])
    return { 2, cachedVal }
end

-- Step 2: Prevent double-holding by the same student for a different request
if redis.call('EXISTS', KEYS[1]) == 1 then
    return { 0, 'STUDENT_ALREADY_HOLDS_ACTIVE_CART' }
end

-- Step 3: Fast capacity check on Redis Inventory Mirror
local countStr = redis.call('HGET', KEYS[3], ARGV[1])
local currentCount = tonumber(countStr or '0')

if not currentCount or currentCount <= 0 then
    return { -1, 'CATEGORY_SOLD_OUT' }
end

-- Step 4: Atomically decrement counter by 1
local newCount = redis.call('HINCRBY', KEYS[3], ARGV[1], -1)

-- Step 5: Set locks with strict 10-minute TTL
redis.call('SET', KEYS[1], ARGV[3], 'EX', ARGV[2])
redis.call('SET', KEYS[2], 'IN_PROGRESS', 'EX', ARGV[2])

return { 1, tostring(newCount) }
`;

export const ATOMIC_ROLLBACK_BOOKING_LOCK_LUA = `
-- KEYS[1]: booking:student_hold:{tenantId}:{studentId}
-- KEYS[2]: booking:idempotency:{tenantId}:{idempotencyKey}
-- KEYS[3]: inv:counts:{tenantId}:{sessionId}
-- ARGV[1]: categoryCode

redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
local restoredCount = redis.call('HINCRBY', KEYS[3], ARGV[1], 1)
return restoredCount
`;

export const ATOMIC_RELEASE_STUDENT_HOLD_LUA = `
-- KEYS[1]: booking:student_hold:{tenantId}:{studentId}
-- KEYS[2]: inv:counts:{tenantId}:{sessionId}
-- ARGV[1]: categoryCode

redis.call('DEL', KEYS[1])
local restoredCount = redis.call('HINCRBY', KEYS[2], ARGV[1], 1)
return restoredCount
`;

/**
 * Distributed Lock & Pre-Flight Gatekeeper Service
 *
 * Distributed Systems Rationale:
 * Protects MongoDB ACID transactions from catastrophic thundering herd contention.
 * Under 10,000+ simultaneous requests, 95% of requests for exhausted categories
 * are rejected at the Redis layer in <1ms without touching the database.
 */
@Injectable()
export class BookingLockService {
  private readonly logger = new Logger(BookingLockService.name);

  constructor(private readonly redisService: VwrRedisService) {}

  /**
   * Acquire atomic distributed lock and decrement Redis counter
   */
  async acquirePreFlightLock(
    tenantId: string,
    sessionId: string,
    studentId: string,
    categoryCode: string,
    idempotencyKey: string,
    ttlSeconds: number = BOOKING_CONSTANTS.DEFAULTS.CART_HOLD_TTL_SECONDS,
  ): Promise<{ status: 'ACQUIRED' | 'IDEMPOTENT_HIT' | 'SOLD_OUT' | 'ALREADY_HELD'; value?: string }> {
    const holdKey = BOOKING_CONSTANTS.KEYS.STUDENT_HOLD(tenantId, studentId);
    const idempKey = BOOKING_CONSTANTS.KEYS.IDEMPOTENCY(tenantId, idempotencyKey);
    const countsKey = INVENTORY_CONSTANTS.KEYS.COUNTS_HASH(tenantId, sessionId);

    const result = await this.redisService.evalScript<[number, string]>(
      ATOMIC_ACQUIRE_BOOKING_LOCK_LUA,
      [holdKey, idempKey, countsKey],
      [categoryCode, ttlSeconds, `HOLD:${Date.now()}`],
    );

    const [code, payload] = result;

    if (code === 1) {
      return { status: 'ACQUIRED', value: payload };
    }
    if (code === 2) {
      return { status: 'IDEMPOTENT_HIT', value: payload };
    }
    if (code === 0) {
      this.logger.warn(`Student ${studentId} already holds an active residential cart.`);
      throw new ConflictException(
        'You already hold an active residential cart hold. Complete payment or cancel the existing hold.',
      );
    }
    if (code === -1) {
      return { status: 'SOLD_OUT' };
    }

    return { status: 'SOLD_OUT' };
  }

  /**
   * Rollback Redis counter and locks if MongoDB transaction fails or aborts
   */
  async rollbackLock(
    tenantId: string,
    sessionId: string,
    studentId: string,
    categoryCode: string,
    idempotencyKey: string,
  ): Promise<void> {
    const holdKey = BOOKING_CONSTANTS.KEYS.STUDENT_HOLD(tenantId, studentId);
    const idempKey = BOOKING_CONSTANTS.KEYS.IDEMPOTENCY(tenantId, idempotencyKey);
    const countsKey = INVENTORY_CONSTANTS.KEYS.COUNTS_HASH(tenantId, sessionId);

    await this.redisService.evalScript(
      ATOMIC_ROLLBACK_BOOKING_LOCK_LUA,
      [holdKey, idempKey, countsKey],
      [categoryCode],
    );

    this.logger.log(`Rolled back Redis lock and restored seat counter for student: ${studentId}`);
  }

  /**
   * Release student hold when cart is confirmed, cancelled, or expired
   */
  async releaseStudentHold(
    tenantId: string,
    sessionId: string,
    studentId: string,
    categoryCode: string,
    restoreCounter: boolean = true,
  ): Promise<void> {
    const holdKey = BOOKING_CONSTANTS.KEYS.STUDENT_HOLD(tenantId, studentId);

    if (restoreCounter) {
      const countsKey = INVENTORY_CONSTANTS.KEYS.COUNTS_HASH(tenantId, sessionId);
      await this.redisService.evalScript(
        ATOMIC_RELEASE_STUDENT_HOLD_LUA,
        [holdKey, countsKey],
        [categoryCode],
      );
    } else {
      await this.redisService.del(holdKey);
    }
  }

  /**
   * Finalize idempotency key with cartId
   */
  async finalizeIdempotencyKey(
    tenantId: string,
    idempotencyKey: string,
    cartId: string,
  ): Promise<void> {
    const idempKey = BOOKING_CONSTANTS.KEYS.IDEMPOTENCY(tenantId, idempotencyKey);
    await this.redisService.setEx(idempKey, BOOKING_CONSTANTS.DEFAULTS.CART_HOLD_TTL_SECONDS, cartId);
  }
}

