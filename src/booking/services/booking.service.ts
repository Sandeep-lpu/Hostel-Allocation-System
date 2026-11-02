import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, isValidObjectId } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ResidentialCart, ResidentialCartDocument } from '../schemas/residential-cart.schema';
import { BedInventory, BedInventoryDocument } from '../../inventory/schemas/bed-inventory.schema';
import { RoomCategory, RoomCategoryDocument } from '../../inventory/schemas/room-category.schema';
import { StudentProfile, StudentProfileDocument } from '../../student/schemas/student-profile.schema';
import { BookingLockService } from './booking-lock.service';
import { InventoryCacheService } from '../../inventory/services/inventory-cache.service';
import { CreateHoldDto } from '../dto/create-hold.dto';
import { FoodServiceChangeDto } from '../dto/food-service-change.dto';
import { CartResponseDto, LockedBedSummary } from '../dto/cart-response.dto';
import { BookingType } from '../enums/booking-type.enum';
import { CartStatus } from '../enums/cart-status.enum';
import { BedStatus } from '../../inventory/enums/bed-status.enum';
import { BOOKING_CONSTANTS } from '../constants/booking.constants';
import { INVENTORY_CONSTANTS } from '../../inventory/constants/inventory.constants';
import { PDF_QUEUE_NAME } from '../../documents/processors/pdf-generation.processor';
import { OutboundWebhookService } from '../../outbound-webhooks/services/outbound-webhook.service';
import { MetricsService } from '../../observability/services/metrics.service';

/**
 * Concurrency-Safe Atomic Booking Engine
 *
 * Implements MongoDB Multi-Document ACID Transactions with Snapshot Isolation
 * and Optimistic Concurrency Control (version increments).
 * Calculates differential pricing for Hostel/Room/Seater changes and manages delayed BullMQ cart expiry.
 */
@Injectable()
export class BookingService implements OnModuleInit {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(ResidentialCart.name)
    private readonly cartModel: Model<ResidentialCartDocument>,
    @InjectModel(BedInventory.name)
    private readonly bedModel: Model<BedInventoryDocument>,
    @InjectModel(RoomCategory.name)
    private readonly categoryModel: Model<RoomCategoryDocument>,
    @InjectModel(StudentProfile.name)
    private readonly studentModel: Model<StudentProfileDocument>,
    private readonly lockService: BookingLockService,
    private readonly cacheService: InventoryCacheService,
    @InjectQueue(BOOKING_CONSTANTS.QUEUES.CART_EXPIRY)
    private readonly expiryQueue: Queue,
    @InjectQueue(PDF_QUEUE_NAME)
    private readonly pdfQueue?: Queue,
    private readonly webhookService?: OutboundWebhookService,
    private readonly metricsService?: MetricsService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.cartModel.createCollection();
      await this.bedModel.createCollection();
    } catch {
      // Collections already exist or created concurrently
    }
  }

  /**
   * High-Concurrency Bed Hold Creation
   * 1. Redis Lua gatekeeper check & atomic counter decrement (<1ms)
   * 2. MongoDB Replica Set multi-document ACID transaction with snapshot isolation
   * 3. BullMQ 10-minute delayed release job dispatch
   */
  async createCartHold(
    studentId: string,
    dto: CreateHoldDto,
    idempotencyKey: string,
  ): Promise<CartResponseDto> {
    const tenantId = dto.tenantId || INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID;
    const academicSession = dto.academicSession || INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID;

    // 1. Pre-flight Redis distributed lock & atomic inventory check
    const preFlight = await this.lockService.acquirePreFlightLock(
      tenantId,
      academicSession,
      studentId,
      dto.selectedCategoryCode,
      idempotencyKey,
    );

    if (preFlight.status === 'IDEMPOTENT_HIT') {
      const existingCartId = preFlight.value;
      if (existingCartId && existingCartId !== 'IN_PROGRESS') {
        const existingCart = await this.cartModel.findById(existingCartId);
        if (existingCart) {
          return this.formatCartResponse(existingCart);
        }
      }
      const existingCartByMongo = await this.cartModel.findOne({ idempotencyKey });
      if (existingCartByMongo) {
        return this.formatCartResponse(existingCartByMongo);
      }
    }

    if (preFlight.status === 'SOLD_OUT') {
      throw new ConflictException(
        `Selected room category '${dto.selectedCategoryCode}' is currently sold out.`,
      );
    }

    // 2. Execute MongoDB Multi-Document ACID Transaction (or atomic OCC if standalone)
    const lockExpiresAt = new Date(Date.now() + BOOKING_CONSTANTS.DEFAULTS.CART_HOLD_TTL_MS);
    const client = (this.connection as any).getClient?.() || (this.connection as any).client;
    const isReplicaSet =
      Boolean(client?.topology?.description?.setName) ||
      client?.topology?.description?.type === 'ReplicaSetWithPrimary';
    const session = isReplicaSet ? await this.connection.startSession() : null;

    try {
      let createdCart: ResidentialCartDocument;

      const executeTransactionOperations = async (activeSession: any) => {
        // A. Fetch Student Profile to detect existing bed allocation (for Hostel Change workflow)
        let profileQuery = this.studentModel.findOne({ tenantId, rollNumber: studentId });
        if (activeSession) profileQuery = profileQuery.session(activeSession);
        const studentProfile = await profileQuery;

        let bookingType = BookingType.FRESH_ALLOCATION;
        let previousBedId = null;
        let previousPaidFee = 0;

        if (studentProfile?.currentAllocation?.categoryCode) {
          bookingType = BookingType.HOSTEL_CHANGE;
          // Look up previous category fee to compute difference
          let catQuery = this.categoryModel.findOne({
            tenantId,
            academicSession,
            categoryCode: studentProfile.currentAllocation.categoryCode,
          });
          if (activeSession) catQuery = catQuery.session(activeSession);
          const previousCategory = await catQuery;

          previousPaidFee = previousCategory?.annualFee || 0;
        }

        // B. Fetch Selected Room Category pricing
        let selCatQuery = this.categoryModel.findOne({
          tenantId,
          academicSession,
          categoryCode: dto.selectedCategoryCode,
        });
        if (activeSession) selCatQuery = selCatQuery.session(activeSession);
        const selectedCategory = await selCatQuery;

        if (!selectedCategory) {
          throw new NotFoundException(
            `Room category '${dto.selectedCategoryCode}' is not configured for session '${academicSession}'.`,
          );
        }

        // C. Calculate Differential Pricing Breakdown
        const baseFee = selectedCategory.annualFee;
        const differentialRoomFee = Math.max(0, baseFee - previousPaidFee);
        const laundryFee = dto.includeLaundry ? BOOKING_CONSTANTS.DEFAULTS.LAUNDRY_FEE : 0;
        const gymFee = dto.includeGym ? BOOKING_CONSTANTS.DEFAULTS.GYM_FEE : 0;
        const totalPayable = differentialRoomFee + laundryFee + gymFee;

        // D. Atomic Bed Locking (Optimistic Concurrency Control)
        let lockedBed: BedInventoryDocument | null = null;

        if (dto.specificBedSelection) {
          // Mode 1: Student picked a specific physical bed (e.g. A619 - Bed C)
          lockedBed = await this.bedModel.findOneAndUpdate(
            {
              tenantId,
              academicSession,
              blockCode: dto.specificBedSelection.blockCode,
              roomNumber: dto.specificBedSelection.roomNumber,
              bedLabel: dto.specificBedSelection.bedLabel,
              status: BedStatus.AVAILABLE,
            },
            {
              $set: {
                status: BedStatus.LOCKED_IN_CART,
                allocatedTo: studentProfile?._id || null,
                lockExpiresAt,
              },
              $inc: { version: 1 },
            },
            { new: true, ...(activeSession ? { session: activeSession } : {}) },
          );

          if (!lockedBed) {
            throw new ConflictException(
              `Bed '${dto.specificBedSelection.roomNumber} - ${dto.specificBedSelection.bedLabel}' is no longer available.`,
            );
          }
        } else {
          // Mode 2: Category Auto-Assign (lock any available bed in the category)
          const partiallyOccupiedRooms = await this.bedModel.aggregate([
            {
              $match: {
                tenantId,
                academicSession,
                categoryCode: dto.selectedCategoryCode,
                status: BedStatus.AVAILABLE,
              },
            },
            {
              $group: {
                _id: {
                  blockCode: '$blockCode',
                  floor: '$floor',
                  roomNumber: '$roomNumber',
                },
                availableBedsCount: { $sum: 1 },
                bedIds: { $push: '$_id' },
              },
            },
            {
              $sort: {
                availableBedsCount: 1,
                '_id.roomNumber': 1,
              },
            },
            {
              $limit: 10,
            },
          ]);

          let candidateIds: any[] = [];
          if (partiallyOccupiedRooms && partiallyOccupiedRooms.length > 0) {
            candidateIds = partiallyOccupiedRooms.flatMap((r) => r.bedIds);
          }

          if (candidateIds.length === 0) {
            throw new ConflictException(
              `No available beds found for category '${dto.selectedCategoryCode}'.`,
            );
          }

          // Scatter candidate ordering across workers to prevent write-lock collisions
          const shuffledCandidates = candidateIds.sort(() => Math.random() - 0.5);
          for (const bedId of shuffledCandidates) {
            lockedBed = await this.bedModel.findOneAndUpdate(
              {
                _id: bedId,
                status: BedStatus.AVAILABLE,
              },
              {
                $set: {
                  status: BedStatus.LOCKED_IN_CART,
                  allocatedTo: studentProfile?._id || null,
                  lockExpiresAt,
                },
                $inc: { version: 1 },
              },
              { new: true, ...(activeSession ? { session: activeSession } : {}) },
            );

            if (lockedBed) break;
          }

          if (!lockedBed) {
            throw new ConflictException(
              `No available beds found for category '${dto.selectedCategoryCode}'.`,
            );
          }
        }

        // E. Create Residential Cart Document
        const cartDocs = await this.cartModel.create(
          [
            {
              tenantId,
              academicSession,
              studentId,
              bookingType,
              lockedBedId: lockedBed._id,
              previousBedId,
              selectedCategoryCode: dto.selectedCategoryCode,
              selectedMessCode: dto.selectedMessCode,
              includeLaundry: !!dto.includeLaundry,
              includeGym: !!dto.includeGym,
              mobile: dto.mobile,
              email: dto.email,
              undertakingAccepted: dto.undertakingAccepted,
              pricingBreakdown: {
                baseFee,
                previousPaidFee,
                differentialRoomFee,
                laundryFee,
                gymFee,
                totalPayable,
              },
              status: CartStatus.HOLD_ACTIVE,
              idempotencyKey,
              expiresAt: lockExpiresAt,
            },
          ],
          activeSession ? { session: activeSession } : undefined,
        );

        createdCart = cartDocs[0];
      };

      if (session) {
        await session.withTransaction(
          async () => {
            await executeTransactionOperations(session);
          },
          {
            readConcern: { level: 'snapshot' },
            writeConcern: { w: 'majority' },
          },
        );
      } else {
        await executeTransactionOperations(null);
      }

      // 3. Post-Transaction Finalization
      await this.lockService.finalizeIdempotencyKey(
        tenantId,
        idempotencyKey,
        createdCart!._id.toString(),
      );

      // 4. Schedule Delayed BullMQ Cart Expiry Job (Fires in exactly 10 minutes)
      // Isolated in try/catch so queue transient hiccups do not abort committed cart
      try {
        await this.expiryQueue.add(
          'expire-cart-job',
          {
            cartId: createdCart!._id.toString(),
            studentId,
            tenantId,
            sessionId: academicSession,
            categoryCode: dto.selectedCategoryCode,
          },
          {
            delay: BOOKING_CONSTANTS.DEFAULTS.CART_HOLD_TTL_MS,
            jobId: `cart-expiry-${createdCart!._id}`,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
      } catch (queueErr: any) {
        this.logger.warn(
          `BullMQ delayed expiry job dispatch deferred: ${queueErr.message}. Fallback 60s cron will safeguard this cart.`,
        );
      }

      this.logger.log(
        `Residential Cart Hold established: Cart ID ${createdCart!._id} for student ${studentId}. Expires in 600s.`,
      );

      return this.formatCartResponse(createdCart!);
    } catch (err: any) {
      this.logger.error(`Booking transaction aborted: ${err.message}. Rolling back Redis lock...`);
      // Rollback Redis inventory counter and student hold
      await this.lockService.rollbackLock(
        tenantId,
        academicSession,
        studentId,
        dto.selectedCategoryCode,
        idempotencyKey,
      );

      // Check if duplicate idempotencyKey error occurred in Mongo
      if (err.code === 11000 && (err.keyPattern?.idempotencyKey || err.message?.includes('idempotencyKey'))) {
        const existingCart = await this.cartModel.findOne({ idempotencyKey });
        if (existingCart) {
          return this.formatCartResponse(existingCart);
        }
      }

      // Translate Mongo write conflicts or transient transaction errors to 409 Conflict
      if (
        err.name === 'MongoServerError' ||
        err.code === 112 ||
        err.hasErrorLabel?.('TransientTransactionError')
      ) {
        throw new ConflictException(
          `Bed inventory for category '${dto.selectedCategoryCode}' experienced concurrent lock contention. Please retry your hold request.`,
        );
      }

      throw err;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Voluntary Cart Release
   * Allows student to release their held bed to pick another category or room.
   */
  async releaseCartHold(
    cartId: string,
    studentId: string,
    tenantId: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID,
  ): Promise<{ success: boolean; message: string }> {
    const client = (this.connection as any).getClient?.() || (this.connection as any).client;
    const isReplicaSet =
      Boolean(client?.topology?.description?.setName) ||
      client?.topology?.description?.type === 'ReplicaSetWithPrimary';
    const session = isReplicaSet ? await this.connection.startSession() : null;

    try {
      const executeReleaseOperations = async (activeSession: any) => {
        const query: any = { tenantId };
        if (isValidObjectId(cartId)) {
          query._id = cartId;
        } else {
          query.idempotencyKey = cartId;
        }
        if (studentId) {
          query.studentId = studentId;
        }
        let cartQuery = this.cartModel.findOne(query);
        if (activeSession) cartQuery = cartQuery.session(activeSession);
        const cart = await cartQuery;

        if (!cart) {
          this.logger.warn(`Cart '${cartId}' not found for cancellation; treating as already released.`);
          return null;
        }

        if (cart.status !== CartStatus.HOLD_ACTIVE) {
          this.logger.warn(
            `Cart '${cartId}' status is '${cart.status}'. Only active holds can be released. Skipping bed revert.`,
          );
          return cart;
        }

        // 1. Mark cart as cancelled
        cart.status = CartStatus.CANCELLED;
        await cart.save(activeSession ? { session: activeSession } : undefined);

        // 2. Revert locked bed back to AVAILABLE
        if (cart.lockedBedId) {
          await this.bedModel.updateOne(
            { _id: cart.lockedBedId },
            {
              $set: {
                status: BedStatus.AVAILABLE,
                allocatedTo: null,
                lockExpiresAt: null,
              },
              $inc: { version: 1 },
            },
            activeSession ? { session: activeSession } : {},
          );
        }
        return cart;
      };

      if (session) {
        await session.withTransaction(async () => {
          await executeReleaseOperations(session);
        });
      } else {
        await executeReleaseOperations(null);
      }

      // 3. Release Redis hold and restore seat counter
      const cart = isValidObjectId(cartId)
        ? await this.cartModel.findById(cartId).lean()
        : await this.cartModel.findOne({ idempotencyKey: cartId }).lean();
      if (cart) {
        await this.lockService.releaseStudentHold(
          tenantId,
          cart.academicSession,
          cart.studentId || studentId,
          cart.selectedCategoryCode,
          true,
        );
      }

      return {
        success: true,
        message: 'Residential cart hold successfully cancelled. Bed released to inventory.',
      };
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Service and Food Change workflow without bed modification
   */
  async createFoodOrServiceChange(
    studentId: string,
    dto: FoodServiceChangeDto,
    idempotencyKey: string,
  ): Promise<CartResponseDto> {
    const tenantId = dto.tenantId || INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID;
    const academicSession = dto.academicSession || INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID;

    const studentProfile = await this.studentModel.findOne({ tenantId, rollNumber: studentId });
    if (!studentProfile || !studentProfile.currentAllocation?.categoryCode) {
      throw new BadRequestException(
        'Student does not have an active bed allocation to request food or service changes.',
      );
    }

    const laundryFee = dto.includeLaundry ? BOOKING_CONSTANTS.DEFAULTS.LAUNDRY_FEE : 0;
    const gymFee = dto.includeGym ? BOOKING_CONSTANTS.DEFAULTS.GYM_FEE : 0;
    const totalPayable = laundryFee + gymFee;
    const expiresAt = new Date(Date.now() + BOOKING_CONSTANTS.DEFAULTS.CART_HOLD_TTL_MS);

    const cart = await this.cartModel.create({
      tenantId,
      academicSession,
      studentId,
      bookingType: BookingType.FOOD_CHANGE,
      lockedBedId: studentProfile.currentAllocation.hostelId || null,
      selectedCategoryCode: studentProfile.currentAllocation.categoryCode,
      selectedMessCode: dto.selectedMessCode,
      includeLaundry: !!dto.includeLaundry,
      includeGym: !!dto.includeGym,
      mobile: studentProfile.mobile,
      email: studentProfile.email,
      undertakingAccepted: dto.undertakingAccepted,
      pricingBreakdown: {
        baseFee: 0,
        previousPaidFee: 0,
        differentialRoomFee: 0,
        laundryFee,
        gymFee,
        totalPayable,
      },
      status: CartStatus.HOLD_ACTIVE,
      idempotencyKey,
      expiresAt,
    });

    return this.formatCartResponse(cart);
  }

  /**
   * Fetch cart by ID
   */
  async getCartById(cartId: string, studentId: string, tenantId: string): Promise<CartResponseDto> {
    const query: any = { tenantId };
    if (isValidObjectId(cartId)) {
      query._id = cartId;
    } else {
      query.idempotencyKey = cartId;
    }
    if (studentId) query.studentId = studentId;

    const cart = await this.cartModel.findOne(query);
    if (!cart) {
      throw new NotFoundException(`Residential cart '${cartId}' not found.`);
    }
    return this.formatCartResponse(cart);
  }

  /**
   * Confirm and settle payment for a held residential cart
   * Transitions Cart -> CONFIRMED, allocates bed, and triggers PDF & ERP Webhook jobs.
   */
  async confirmAndSettlePayment(
    cartId: string,
    studentId: string,
    tenantId: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID,
    transactionRef: string = `TXN-${Date.now()}`,
  ): Promise<CartResponseDto> {
    const client = (this.connection as any).getClient?.() || (this.connection as any).client;
    const isReplicaSet =
      Boolean(client?.topology?.description?.setName) ||
      client?.topology?.description?.type === 'ReplicaSetWithPrimary';
    const session = isReplicaSet ? await this.connection.startSession() : null;
    let confirmedCart: ResidentialCartDocument | null = null;

    try {
      const executeConfirmationOperations = async (activeSession: any) => {
        const query: any = { tenantId };
        if (isValidObjectId(cartId)) {
          query._id = cartId;
        } else {
          query.idempotencyKey = cartId;
        }
        if (studentId) query.studentId = studentId;

        let cartQuery = this.cartModel.findOne(query);
        if (activeSession) cartQuery = cartQuery.session(activeSession);
        const cart = await cartQuery;

        if (!cart) {
          throw new NotFoundException(`Residential cart '${cartId}' not found.`);
        }

        if (cart.status === CartStatus.CONFIRMED) {
          confirmedCart = cart;
          return;
        }

        if (
          cart.status !== CartStatus.HOLD_ACTIVE &&
          cart.status !== CartStatus.PAYMENT_INITIATED
        ) {
          throw new BadRequestException(
            `Cannot confirm payment for cart in status '${cart.status}'.`,
          );
        }

        cart.status = CartStatus.CONFIRMED;
        await cart.save(activeSession ? { session: activeSession } : undefined);

        // Definitively allocate the bed
        let bed: BedInventoryDocument | null = null;
        if (cart.lockedBedId) {
          bed = await this.bedModel.findByIdAndUpdate(
            cart.lockedBedId,
            {
              $set: {
                status: BedStatus.BOOKED,
                lockExpiresAt: null,
              },
              $inc: { version: 1 },
            },
            { new: true, ...(activeSession ? { session: activeSession } : {}) },
          );
        }

        // Update StudentProfile with permanent allocation
        let profQuery = this.studentModel.findOne({ tenantId, rollNumber: studentId });
        if (activeSession) profQuery = profQuery.session(activeSession);
        const studentProfile = await profQuery;

        if (studentProfile && bed) {
          studentProfile.currentAllocation = {
            blockCode: bed.blockCode,
            roomNumber: bed.roomNumber,
            bedLabel: bed.bedLabel,
            seaterCount: 3,
            categoryCode: cart.selectedCategoryCode,
            messService: cart.selectedMessCode,
            laundryService: cart.includeLaundry ? 'Annual Laundry Package' : '',
            gymService: cart.includeGym ? 'Annual Gym Membership' : '',
            allocatedAt: new Date(),
          };
          await studentProfile.save(activeSession ? { session: activeSession } : undefined);
        }

        confirmedCart = cart;
      };

      if (session) {
        await session.withTransaction(async () => {
          await executeConfirmationOperations(session);
        });
      } else {
        await executeConfirmationOperations(null);
      }

      // Release temporary lock from Redis
      await this.lockService.releaseStudentHold(
        tenantId,
        confirmedCart!.academicSession,
        studentId,
        confirmedCart!.selectedCategoryCode,
        false, // do not restore counter because bed is permanently booked!
      );

      // Enqueue PDF Allotment Slip Generation job
      if (this.pdfQueue) {
        try {
          await this.pdfQueue.add(
            'generate-pdf',
            {
              cartId: confirmedCart!._id.toString(),
              tenantId,
              studentId,
              transactionRef,
            },
            {
              attempts: 3,
              backoff: { type: 'exponential', delay: 1000 },
              removeOnComplete: true,
            },
          );
        } catch (pdfErr: any) {
          this.logger.warn(`Failed to enqueue PDF generation: ${pdfErr.message}`);
        }
      }

      // Enqueue Outbound Campus ERP Webhook event
      if (this.webhookService) {
        try {
          await this.webhookService.dispatchEvent(tenantId, 'allocation.confirmed', {
            cartId: confirmedCart!._id.toString(),
            studentId,
            transactionRef,
            categoryCode: confirmedCart!.selectedCategoryCode,
            bedId: confirmedCart!.lockedBedId?.toString(),
            messCode: confirmedCart!.selectedMessCode,
            totalPayable: confirmedCart!.pricingBreakdown?.totalPayable,
            confirmedAt: new Date().toISOString(),
          });
        } catch (whErr: any) {
          this.logger.warn(`Failed to dispatch ERP webhook: ${whErr.message}`);
        }
      }

      // Track metric
      if (this.metricsService) {
        this.metricsService.bookingTransactionsTotal.inc({
          status: 'CONFIRMED',
          bookingType: confirmedCart!.bookingType,
        });
      }

      this.logger.log(
        `Cart ${cartId} confirmed and settled. Enqueued PDF & Outbound Webhook pipelines.`,
      );
      return this.formatCartResponse(confirmedCart!);
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Helper to format response DTO
   */
  private async formatCartResponse(cart: ResidentialCartDocument): Promise<CartResponseDto> {
    let lockedBedSummary: LockedBedSummary | null = null;

    if (cart.lockedBedId) {
      const bed = await this.bedModel.findById(cart.lockedBedId).lean();
      if (bed) {
        lockedBedSummary = {
          bedId: bed._id.toString(),
          blockCode: bed.blockCode,
          floor: bed.floor,
          roomNumber: bed.roomNumber,
          bedLabel: bed.bedLabel,
          categoryCode: bed.categoryCode,
        };
      }
    }

    const now = Date.now();
    const expiryTime = new Date(cart.expiresAt).getTime();
    const remainingSeconds = Math.max(0, Math.ceil((expiryTime - now) / 1000));

    return {
      cartId: cart._id.toString(),
      tenantId: cart.tenantId,
      academicSession: cart.academicSession,
      studentId: cart.studentId,
      bookingType: cart.bookingType,
      status: cart.status,
      lockedBed: lockedBedSummary,
      previousBedId: cart.previousBedId?.toString() || null,
      selectedCategoryCode: cart.selectedCategoryCode,
      selectedMessCode: cart.selectedMessCode,
      includeLaundry: cart.includeLaundry,
      includeGym: cart.includeGym,
      pricingBreakdown: cart.pricingBreakdown,
      expiresAt: cart.expiresAt,
      remainingSeconds,
      undertakingAccepted: cart.undertakingAccepted,
      idempotencyKey: cart.idempotencyKey,
      createdAt: (cart as any).createdAt,
    };
  }
}

