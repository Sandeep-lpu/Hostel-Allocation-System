import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { VwrRedisService } from './redis/redis.service';
import { WaitingRoomService } from './waiting-room.service';
import { VWR_CONSTANTS } from './constants/waiting-room.constants';
import {
  ATOMIC_ADMIT_BATCH_LUA,
  CLEANUP_EXPIRED_ACTIVE_LUA,
} from './lua/waiting-room.lua';

/**
 * Leaky-Bucket Turnstile Coordinator Worker
 *
 * Distributed Systems Rationale:
 * Regulates the influx of students into the booking portal to protect MongoDB transactions
 * and inventory locks from crashing under 10,000+ concurrent users.
 * Runs an atomic Redis Lua turnstile tick every 2 seconds across all active admission queues.
 */
@Injectable()
export class TurnstileWorkerService implements OnModuleInit {
  private readonly logger = new Logger(TurnstileWorkerService.name);
  private isProcessing = false;
  private maxActiveCapacity: number;
  private sessionTtlSeconds: number;
  private maxBatchPerTick: number;

  constructor(
    private readonly redisService: VwrRedisService,
    private readonly waitingRoomService: WaitingRoomService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.maxActiveCapacity = this.configService.get<number>(
      'VWR_MAX_ACTIVE_CAPACITY',
      VWR_CONSTANTS.DEFAULTS.MAX_CONCURRENT_ACTIVE,
    );
    this.sessionTtlSeconds = this.configService.get<number>(
      'VWR_SESSION_TTL_SECONDS',
      VWR_CONSTANTS.DEFAULTS.ADMISSION_PASS_TTL_SECONDS,
    );
    this.maxBatchPerTick = this.configService.get<number>(
      'VWR_MAX_BATCH_PER_TICK',
      VWR_CONSTANTS.DEFAULTS.MAX_BATCH_ADMIT_PER_TICK,
    );

    this.logger.log(
      `Turnstile Worker Initialized: [MaxActive: ${this.maxActiveCapacity}, TTL: ${this.sessionTtlSeconds}s, BatchLimit: ${this.maxBatchPerTick}]`,
    );
  }

  /**
   * Turnstile Interval Loop (Runs every 2000ms)
   * Leaky-Bucket gatekeeper evaluating active queues and admitting students in batches.
   */
  @Interval(VWR_CONSTANTS.DEFAULTS.TURNSTILE_INTERVAL_MS)
  async handleTurnstileTick(): Promise<void> {
    if (this.isProcessing) {
      return; // Prevent overlapping runs if previous cycle experiences network lag
    }

    this.isProcessing = true;

    try {
      // Discover all registered active booking sessions
      const activeSessions = await this.redisService.getClient().smembers('vwr:active_sessions');

      if (!activeSessions || activeSessions.length === 0) {
        return;
      }

      for (const sessionKey of activeSessions) {
        const [tenantId, sessionId] = sessionKey.split(':');
        if (tenantId && sessionId) {
          await this.processSessionTurnstile(tenantId, sessionId);
        }
      }
    } catch (err) {
      this.logger.error(`Error in turnstile worker loop: ${err.message}`, err.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single session's turnstile gate atomically
   */
  public async processSessionTurnstile(
    tenantId: string,
    sessionId: string,
  ): Promise<string[]> {
    const queueKey = VWR_CONSTANTS.KEYS.QUEUE(tenantId, sessionId);
    const activeSetKey = VWR_CONSTANTS.KEYS.ACTIVE_SET(tenantId, sessionId);
    const activeExpKey = VWR_CONSTANTS.KEYS.ACTIVE_EXPIRY_ZSET(tenantId, sessionId);

    const nowEpochSeconds = Math.floor(Date.now() / 1000);

    // 1. Execute Atomic Admission Batch Lua script
    const admittedStudents: string[] = await this.redisService.evalScript<string[]>(
      ATOMIC_ADMIT_BATCH_LUA,
      [queueKey, activeSetKey, activeExpKey],
      [
        this.maxActiveCapacity,
        nowEpochSeconds,
        this.sessionTtlSeconds,
        this.maxBatchPerTick,
      ],
    );

    if (admittedStudents && admittedStudents.length > 0) {
      this.logger.log(
        `Turnstile admitted ${admittedStudents.length} students for session [${tenantId}:${sessionId}]. Top admissions: ${admittedStudents.slice(0, 5).join(', ')}`,
      );

      // 2. Issue signed Admission JWT passes for each admitted student
      await Promise.all(
        admittedStudents.map((studentId) =>
          this.waitingRoomService.issueAdmissionPass(
            tenantId,
            sessionId,
            studentId,
            this.sessionTtlSeconds,
          ),
        ),
      );
    }

    return admittedStudents || [];
  }

  /**
   * Periodic routine to evict expired active shoppers and log capacity recovery
   */
  public async cleanupExpiredSessions(
    tenantId: string,
    sessionId: string,
  ): Promise<number> {
    const activeSetKey = VWR_CONSTANTS.KEYS.ACTIVE_SET(tenantId, sessionId);
    const activeExpKey = VWR_CONSTANTS.KEYS.ACTIVE_EXPIRY_ZSET(tenantId, sessionId);
    const nowEpochSeconds = Math.floor(Date.now() / 1000);

    const evicted: string[] = await this.redisService.evalScript<string[]>(
      CLEANUP_EXPIRED_ACTIVE_LUA,
      [activeSetKey, activeExpKey],
      [nowEpochSeconds],
    );

    if (evicted && evicted.length > 0) {
      this.logger.log(
        `Evicted ${evicted.length} expired active sessions from [${tenantId}:${sessionId}], freeing capacity.`,
      );
    }

    return evicted ? evicted.length : 0;
  }
}
