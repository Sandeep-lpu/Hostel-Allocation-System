import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Job } from 'bullmq';
import { Cron } from '@nestjs/schedule';
import { ResidentialCart, ResidentialCartDocument } from '../schemas/residential-cart.schema';
import { BedInventory, BedInventoryDocument } from '../../inventory/schemas/bed-inventory.schema';
import { BookingLockService } from '../services/booking-lock.service';
import { InventoryCacheService } from '../../inventory/services/inventory-cache.service';
import { CartStatus } from '../enums/cart-status.enum';
import { BedStatus } from '../../inventory/enums/bed-status.enum';
import { BOOKING_CONSTANTS } from '../constants/booking.constants';

export interface CartExpiryJobPayload {
  cartId: string;
  studentId: string;
  tenantId: string;
  sessionId: string;
  categoryCode: string;
}

/**
 * Self-Healing Cart Expiry Processor
 *
 * Distributed Systems Rationale:
 * Guarantees zero inventory leakage. If a student holds a bed and abandons checkout,
 * this delayed worker automatically expires the cart after 10 minutes, restores the bed
 * to AVAILABLE status, increments the Redis counter, and broadcasts the freed seat via SSE.
 * A fallback 60-second cron job sweeps any orphaned locks caused by temporary worker outages.
 */
@Processor(BOOKING_CONSTANTS.QUEUES.CART_EXPIRY)
export class CartExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(CartExpiryProcessor.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(ResidentialCart.name)
    private readonly cartModel: Model<ResidentialCartDocument>,
    @InjectModel(BedInventory.name)
    private readonly bedModel: Model<BedInventoryDocument>,
    private readonly lockService: BookingLockService,
    private readonly cacheService: InventoryCacheService,
  ) {
    super();
  }

  /**
   * BullMQ Delayed Job Handler (Triggers after 10-minute hold window)
   */
  async process(job: Job<CartExpiryJobPayload>): Promise<void> {
    const { cartId, studentId, tenantId, sessionId, categoryCode } = job.data;
    this.logger.log(`Evaluating 10-minute cart expiry for Cart ID: ${cartId} (Student: ${studentId})`);

    const session = await this.connection.startSession();

    try {
      let releasedBedId: string | null = null;

      await session.withTransaction(async () => {
        const cart = await this.cartModel.findById(cartId).session(session);

        if (!cart) {
          this.logger.warn(`Cart ${cartId} not found during expiry check.`);
          return;
        }

        // Only expire if the student has NOT confirmed payment
        if (
          cart.status !== CartStatus.HOLD_ACTIVE &&
          cart.status !== CartStatus.PAYMENT_INITIATED
        ) {
          this.logger.log(
            `Cart ${cartId} is already in state '${cart.status}'. Skipping auto-expiry.`,
          );
          return;
        }

        // 1. Mark cart as EXPIRED
        cart.status = CartStatus.EXPIRED;
        await cart.save({ session });

        // 2. Revert locked bed back to AVAILABLE
        if (cart.lockedBedId) {
          await this.bedModel.updateOne(
            {
              _id: cart.lockedBedId,
              status: BedStatus.LOCKED_IN_CART,
            },
            {
              $set: {
                status: BedStatus.AVAILABLE,
                allocatedTo: null,
                lockExpiresAt: null,
              },
              $inc: { version: 1 },
            },
            { session },
          );
          releasedBedId = cart.lockedBedId.toString();
        }
      });

      // 3. Post-Transaction: Restore Redis inventory counters and release student hold
      if (releasedBedId) {
        await this.lockService.releaseStudentHold(
          tenantId,
          sessionId,
          studentId,
          categoryCode,
          true,
        );
        this.logger.log(
          `Successfully expired Cart ${cartId}. Bed ${releasedBedId} restored to inventory for session ${sessionId}.`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Error during cart expiry processing for Cart ${cartId}: ${err.message}`, err.stack);
      throw err;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Fallback Orphaned Lock Sweeper Cron Job
   * Runs every 60 seconds to catch and release any carts whose BullMQ jobs failed or were dropped.
   */
  @Cron('0 * * * * *')
  async sweepOrphanedExpiredLocks(): Promise<void> {
    const now = new Date();
    const expiredCarts = await this.cartModel
      .find({
        status: { $in: [CartStatus.HOLD_ACTIVE, CartStatus.PAYMENT_INITIATED] },
        expiresAt: { $lt: now },
      })
      .limit(50);

    if (expiredCarts.length === 0) {
      return;
    }

    this.logger.warn(`Found ${expiredCarts.length} orphaned expired carts during fallback sweep.`);

    for (const cart of expiredCarts) {
      const session = await this.connection.startSession();
      try {
        await session.withTransaction(async () => {
          cart.status = CartStatus.EXPIRED;
          await cart.save({ session });

          if (cart.lockedBedId) {
            await this.bedModel.updateOne(
              {
                _id: cart.lockedBedId,
                status: BedStatus.LOCKED_IN_CART,
              },
              {
                $set: {
                  status: BedStatus.AVAILABLE,
                  allocatedTo: null,
                  lockExpiresAt: null,
                },
                $inc: { version: 1 },
              },
              { session },
            );
          }
        });

        // Restore counter in Redis
        await this.lockService.releaseStudentHold(
          cart.tenantId,
          cart.academicSession,
          cart.studentId,
          cart.selectedCategoryCode,
          true,
        );
      } catch (err: any) {
        this.logger.error(`Failed to sweep expired cart ${cart._id}: ${err.message}`);
      } finally {
        await session.endSession();
      }
    }
  }
}

