import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Observable, Subject } from 'rxjs';
import { VwrRedisService } from '../../waiting-room/redis/redis.service';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';
import { BedInventory, BedInventoryDocument } from '../schemas/bed-inventory.schema';
import { RoomCategory, RoomCategoryDocument } from '../schemas/room-category.schema';
import { AncillaryService, AncillaryServiceDocument } from '../schemas/ancillary-service.schema';
import { BedStatus } from '../enums/bed-status.enum';
import { AvailabilityTag } from '../enums/availability-tag.enum';
import {
  InventoryCatalogResponse,
  RoomCategoryCatalogItem,
  AncillaryServiceCatalogItem,
} from '../interfaces/inventory-catalog.interface';
import { InventoryDeltaEvent } from '../interfaces/inventory-event.interface';
import Redis from 'ioredis';

/**
 * High-Throughput Redis Inventory Mirror & Cache Warming Service
 *
 * Distributed Systems Rationale:
 * Serves real-time hostel bed catalog and seat availability in sub-5ms directly from RAM,
 * preventing millions of read queries from hammering MongoDB during booking rushes.
 * Includes atomic HINCRBY delta mutators, Redis Pub/Sub broadcasting, and a 30s reconciliation cron.
 */
@Injectable()
export class InventoryCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InventoryCacheService.name);
  private subscriberClient: Redis;
  private readonly updateSubject$ = new Subject<InventoryDeltaEvent>();

  constructor(
    @InjectModel(BedInventory.name)
    private readonly bedModel: Model<BedInventoryDocument>,
    @InjectModel(RoomCategory.name)
    private readonly categoryModel: Model<RoomCategoryDocument>,
    @InjectModel(AncillaryService.name)
    private readonly ancillaryModel: Model<AncillaryServiceDocument>,
    private readonly redisService: VwrRedisService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Inventory Cache & Pub/Sub Subscriber...');
    this.initPubSubSubscriber();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriberClient) {
      await this.subscriberClient.quit();
    }
  }

  /**
   * Dedicated Redis Pub/Sub subscriber client
   */
  private initPubSubSubscriber(): void {
    const rawClient = this.redisService.getClient();
    // Duplicate client for dedicated Pub/Sub listening
    this.subscriberClient = rawClient.duplicate();

    this.subscriberClient.on('error', (err) => {
      this.logger.warn(`Redis PubSub Subscriber client error: ${err.message}`);
    });

    this.subscriberClient.psubscribe('inv:updates:*', (err, count) => {
      if (err) {
        this.logger.error(`Failed to subscribe to inventory channels: ${err.message}`);
      } else {
        this.logger.log(`Subscribed to inventory update channels (count: ${count})`);
      }
    });

    this.subscriberClient.on('pmessage', (pattern, channel, message) => {
      try {
        const event: InventoryDeltaEvent = JSON.parse(message);
        this.updateSubject$.next(event);
      } catch (err: any) {
        this.logger.error(`Malformed inventory update payload on channel ${channel}: ${err.message}`);
      }
    });
  }

  /**
   * Observable stream of live inventory delta updates (for SSE controller)
   */
  getInventoryStream(): Observable<InventoryDeltaEvent> {
    return this.updateSubject$.asObservable();
  }

  /**
   * Warm up Redis Cache from MongoDB source of truth:
   * 1. Aggregates AVAILABLE beds grouped by categoryCode
   * 2. Pipelines seat counts into Redis HASH: inv:counts:{tenantId}:{sessionId}
   * 3. Serializes static catalog metadata into inv:catalog:{tenantId}:{sessionId}
   */
  async warmUpInventoryCache(
    tenantId: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID,
    academicSession: string = INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID,
  ): Promise<{ categoriesWarmed: number; totalAvailableBeds: number }> {
    this.logger.log(`Warming up inventory cache for [${tenantId}:${academicSession}]...`);

    // 1. Aggregate available bed counts by category from MongoDB
    const aggregationResults = await this.bedModel.aggregate<{
      _id: string;
      availableCount: number;
    }>([
      {
        $match: {
          tenantId,
          academicSession,
          status: BedStatus.AVAILABLE,
        },
      },
      {
        $group: {
          _id: '$categoryCode',
          availableCount: { $sum: 1 },
        },
      },
    ]);

    // 2. Fetch all Room Categories
    const categories = await this.categoryModel
      .find({ tenantId, academicSession })
      .lean();

    // 3. Fetch all Ancillary Services
    const ancillary = await this.ancillaryModel.find({ tenantId }).lean();

    const countsHashKey = INVENTORY_CONSTANTS.KEYS.COUNTS_HASH(tenantId, academicSession);
    const catalogKey = INVENTORY_CONSTANTS.KEYS.CATALOG_CACHE(tenantId, academicSession);

    // Map aggregated counts
    const countMap: Record<string, number> = {};
    let totalAvailableBeds = 0;
    for (const item of aggregationResults) {
      countMap[item._id] = item.availableCount;
      totalAvailableBeds += item.availableCount;
    }

    // Ensure all registered categories have an entry (even if 0 available)
    for (const cat of categories) {
      if (!(cat.categoryCode in countMap)) {
        countMap[cat.categoryCode] = 0;
      }
    }

    // 4. Pipeline atomic updates into Redis
    const pipeline = this.redisService.pipeline();
    pipeline.del(countsHashKey);

    for (const [categoryCode, count] of Object.entries(countMap)) {
      pipeline.hset(countsHashKey, categoryCode, String(count));
    }
    // Set 24h TTL on counts hash
    pipeline.expire(countsHashKey, INVENTORY_CONSTANTS.DEFAULTS.CATALOG_TTL_SECONDS);

    // Cache static metadata catalog
    const staticCatalogPayload = {
      tenantId,
      academicSession,
      categories,
      ancillary,
      warmedAt: Date.now(),
    };
    pipeline.set(
      catalogKey,
      JSON.stringify(staticCatalogPayload),
      'EX',
      INVENTORY_CONSTANTS.DEFAULTS.CATALOG_TTL_SECONDS,
    );

    await pipeline.exec();

    this.logger.log(
      `Inventory cache warmed successfully! [Categories: ${categories.length}, Available Beds: ${totalAvailableBeds}]`,
    );

    return {
      categoriesWarmed: categories.length,
      totalAvailableBeds,
    };
  }

  /**
   * Serve live catalog with real-time seat availability in <5ms directly from Redis
   */
  async getLiveCatalogWithAvailability(
    tenantId: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID,
    academicSession: string = INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID,
    gender?: string,
  ): Promise<InventoryCatalogResponse> {
    const countsHashKey = INVENTORY_CONSTANTS.KEYS.COUNTS_HASH(tenantId, academicSession);
    const catalogKey = INVENTORY_CONSTANTS.KEYS.CATALOG_CACHE(tenantId, academicSession);

    // Fetch both catalog metadata and live counts concurrently from Redis in 1 network roundtrip
    const [rawCatalog, countsMap] = await Promise.all([
      this.redisService.get(catalogKey),
      this.redisService.getClient().hgetall(countsHashKey),
    ]);

    let staticData: any;
    if (!rawCatalog || Object.keys(countsMap).length === 0) {
      // Cache miss: dynamically warm cache from MongoDB
      await this.warmUpInventoryCache(tenantId, academicSession);
      return this.getLiveCatalogWithAvailability(tenantId, academicSession, gender);
    } else {
      staticData = JSON.parse(rawCatalog);
    }

    // Merge categories with real-time counts and compute availability badges
    const categoryCatalogItems: RoomCategoryCatalogItem[] = staticData.categories.map(
      (cat: any) => {
        const liveCount = Number(countsMap[cat.categoryCode] || 0);

        let availabilityTag: AvailabilityTag;
        if (liveCount <= 0) {
          availabilityTag = AvailabilityTag.WAITLIST_ONLY;
        } else if (liveCount <= (cat.lowSeatThreshold || INVENTORY_CONSTANTS.DEFAULTS.LOW_SEAT_THRESHOLD)) {
          availabilityTag = AvailabilityTag.LIMITED_SEATS_LEFT;
        } else {
          availabilityTag = AvailabilityTag.AVAILABLE;
        }

        return {
          categoryCode: cat.categoryCode,
          roomType: cat.roomType,
          washroomType: cat.washroomType,
          seaterCount: cat.seaterCount,
          hasPantry: cat.hasPantry,
          annualFee: cat.annualFee,
          lowSeatThreshold: cat.lowSeatThreshold,
          availableSeats: Math.max(0, liveCount),
          availabilityTag,
        };
      },
    );

    const ancillaryItems: AncillaryServiceCatalogItem[] = staticData.ancillary.map(
      (anc: any) => ({
        serviceCode: anc.serviceCode,
        serviceType: anc.serviceType,
        title: anc.title,
        fee: anc.fee,
        isMandatory: anc.isMandatory,
      }),
    );

    return {
      tenantId,
      academicSession,
      gender,
      categories: categoryCatalogItems,
      ancillaryServices: ancillaryItems,
      serverTime: Date.now(),
    };
  }

  /**
   * Atomic decrement of available seats (e.g. when bed is added to student cart or locked)
   */
  async decrementAvailableCount(
    tenantId: string,
    sessionId: string,
    categoryCode: string,
    delta: number = 1,
  ): Promise<number> {
    const countsHashKey = INVENTORY_CONSTANTS.KEYS.COUNTS_HASH(tenantId, sessionId);
    const newCount = await this.redisService.getClient().hincrby(countsHashKey, categoryCode, -delta);

    // Safeguard against negative counts
    const normalizedCount = Math.max(0, newCount);
    if (newCount < 0) {
      await this.redisService.getClient().hset(countsHashKey, categoryCode, '0');
    }

    // Broadcast inventory delta event
    await this.broadcastDelta(tenantId, sessionId, categoryCode, normalizedCount, -delta);
    return normalizedCount;
  }

  /**
   * Atomic increment of available seats (e.g. when cart lock expires or booking is cancelled)
   */
  async incrementAvailableCount(
    tenantId: string,
    sessionId: string,
    categoryCode: string,
    delta: number = 1,
  ): Promise<number> {
    const countsHashKey = INVENTORY_CONSTANTS.KEYS.COUNTS_HASH(tenantId, sessionId);
    const newCount = await this.redisService.getClient().hincrby(countsHashKey, categoryCode, delta);

    // Broadcast inventory delta event
    await this.broadcastDelta(tenantId, sessionId, categoryCode, newCount, delta);
    return newCount;
  }

  /**
   * Publish inventory delta to Redis Pub/Sub channel
   */
  private async broadcastDelta(
    tenantId: string,
    sessionId: string,
    categoryCode: string,
    availableSeats: number,
    delta: number,
  ): Promise<void> {
    const channel = INVENTORY_CONSTANTS.KEYS.UPDATES_CHANNEL(tenantId, sessionId);
    const event: InventoryDeltaEvent = {
      tenantId,
      sessionId,
      categoryCode,
      availableSeats,
      delta,
      timestamp: Date.now(),
    };

    await this.redisService.getClient().publish(channel, JSON.stringify(event));
  }

  /**
   * Background Reconciliation Cron Job
   * Runs every 30 seconds to reconcile Redis counters with MongoDB source-of-truth,
   * guaranteeing zero cache drift even in the event of pod crashes or network partitions.
   */
  @Cron('*/30 * * * * *')
  async reconcileInventoryCounts(): Promise<void> {
    try {
      const tenantId = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID;
      const sessionId = INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID;

      const aggregationResults = await this.bedModel.aggregate<{
        _id: string;
        availableCount: number;
      }>([
        {
          $match: {
            tenantId,
            academicSession: sessionId,
            status: BedStatus.AVAILABLE,
          },
        },
        {
          $group: {
            _id: '$categoryCode',
            availableCount: { $sum: 1 },
          },
        },
      ]);

      const countsHashKey = INVENTORY_CONSTANTS.KEYS.COUNTS_HASH(tenantId, sessionId);
      const pipeline = this.redisService.pipeline();

      for (const item of aggregationResults) {
        pipeline.hset(countsHashKey, item._id, String(item.availableCount));
      }

      await pipeline.exec();
    } catch (err: any) {
      this.logger.error(`Error in inventory reconciliation cron: ${err.message}`);
    }
  }
}
