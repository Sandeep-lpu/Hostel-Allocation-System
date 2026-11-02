import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { VwrRedisService } from './redis/redis.service';
import { VWR_CONSTANTS } from './constants/waiting-room.constants';
import { QueueScoringMode } from './enums/scoring-mode.enum';
import { QueueStatus } from './enums/queue-status.enum';
import { JoinQueueDto } from './dto/join-queue.dto';
import {
  QueueEntryMeta,
  QueueStatusResponse,
} from './interfaces/queue-entry.interface';
import {
  AdmissionTokenPayload,
  StoredAdmissionPass,
} from './interfaces/admission-token.interface';
import { AdmissionPassGuard } from './guards/admission-pass.guard';

/**
 * Waiting Room Service
 *
 * Core engine for queue scoring, idempotency, rank calculations, and dynamic ETA estimation.
 */
@Injectable()
export class WaitingRoomService {
  private readonly logger = new Logger(WaitingRoomService.name);

  constructor(private readonly redisService: VwrRedisService) {}

  /**
   * Register or Re-join a student into the Virtual Waiting Room.
   *
   * Idempotency & Refresh Resilience:
   * Uses Redis `ZADD NX` (Not eXists). If a student refreshes their browser, loses connectivity,
   * or has multiple tabs open, their original score/position is preserved with 0 duplicate entries.
   */
  async joinQueue(dto: JoinQueueDto): Promise<QueueStatusResponse> {
    const {
      studentId,
      tenantId,
      sessionId,
      scoringMode = QueueScoringMode.STRICT_FIFO,
      priorityTier = 1,
      bookingStartTime,
    } = dto;

    const queueKey = VWR_CONSTANTS.KEYS.QUEUE(tenantId, sessionId);
    const activeSetKey = VWR_CONSTANTS.KEYS.ACTIVE_SET(tenantId, sessionId);
    const entryMetaKey = VWR_CONSTANTS.KEYS.ENTRY_META(tenantId, sessionId, studentId);

    // 1. Check if the student has already been admitted to the booking portal
    const isAlreadyActive = await this.redisService.sismember(activeSetKey, studentId);
    if (isAlreadyActive) {
      return this.getActiveStudentStatus(tenantId, sessionId, studentId);
    }

    // 2. Check if student already has a rank in the waiting queue (Idempotent check)
    const existingRank = await this.redisService.zrank(queueKey, studentId);
    if (existingRank !== null) {
      this.logger.debug(
        `Student ${studentId} refreshed queue. Retaining existing rank #${existingRank + 1}`,
      );
      return this.getQueueStatus(studentId, tenantId, sessionId);
    }

    // 3. Compute score based on tenant-configured fairness mode
    const calculatedScore = this.computeScore(
      scoringMode,
      priorityTier,
      bookingStartTime,
    );

    // 4. Atomic ZADD NX to ensure idempotent insertion
    const addedCount = await this.redisService.zaddNx(
      queueKey,
      calculatedScore,
      studentId,
    );

    // Register active session for turnstile workers
    await this.redisService.getClient().sadd('vwr:active_sessions', `${tenantId}:${sessionId}`);

    // 5. Store metadata in Redis for auditing and telemetry
    const meta: QueueEntryMeta = {
      studentId,
      tenantId,
      sessionId,
      scoringMode,
      priorityTier,
      joinedAt: Date.now(),
      assignedScore: calculatedScore,
    };
    await this.redisService.setEx(
      entryMetaKey,
      86400, // 24-hour TTL for entry metadata
      JSON.stringify(meta),
    );

    this.logger.log(
      `Student ${studentId} joined queue '${queueKey}' [Mode: ${scoringMode}, Score: ${calculatedScore}, Added: ${addedCount === 1}]`,
    );

    // 6. Return computed position and dynamic ETA
    return this.getQueueStatus(studentId, tenantId, sessionId);
  }

  /**
   * Calculate queue score adhering to the 3 required architectural modes:
   * 1. STRICT_FIFO: high_precision_epoch_microseconds
   * 2. FAIR_LOTTERY: crypto random for pre-lobby, timestamp + offset for post-lobby
   * 3. MERIT_WEIGHTED: (priorityTier * 10^13) + timestamp
   */
  public computeScore(
    scoringMode: QueueScoringMode,
    priorityTier: number = 1,
    bookingStartTime?: number,
  ): number {
    const nowMs = Date.now();
    const hrMicros = Math.floor(process.hrtime()[1] / 1000) % 1000;
    const microEpoch = nowMs * 1000 + hrMicros;

    switch (scoringMode) {
      case QueueScoringMode.STRICT_FIFO:
        return microEpoch;

      case QueueScoringMode.FAIR_LOTTERY: {
        const isPreLobby =
          bookingStartTime && nowMs < bookingStartTime;

        if (isPreLobby) {
          // Cryptographically secure uniform random score between 1 and LOTTERY_MAX_SCORE
          // Prevents early refresh-spammers from gaining an unfair advantage
          return crypto.randomInt(1, VWR_CONSTANTS.DEFAULTS.LOTTERY_MAX_SCORE);
        } else {
          // Users joining after booking starts are sequenced behind the lottery pool in pure FIFO order
          return VWR_CONSTANTS.DEFAULTS.POST_LOBBY_FIFO_OFFSET + microEpoch;
        }
      }

      case QueueScoringMode.MERIT_WEIGHTED: {
        // Merit tiers: Lower tier number = higher priority (Tier 1 > Tier 2 > Tier 3)
        // Score = (priorityTier * 10^13) + timestamp
        const tierOffset = priorityTier * VWR_CONSTANTS.DEFAULTS.MERIT_TIER_MULTIPLIER;
        return tierOffset + nowMs;
      }

      default:
        return microEpoch;
    }
  }

  /**
   * Retrieve current queue status, rank, and estimated wait time
   */
  async getQueueStatus(
    studentId: string,
    tenantId: string,
    sessionId: string,
  ): Promise<QueueStatusResponse> {
    const queueKey = VWR_CONSTANTS.KEYS.QUEUE(tenantId, sessionId);
    const activeSetKey = VWR_CONSTANTS.KEYS.ACTIVE_SET(tenantId, sessionId);

    // 1. Check if user is already admitted
    const isActive = await this.redisService.sismember(activeSetKey, studentId);
    if (isActive) {
      return this.getActiveStudentStatus(tenantId, sessionId, studentId);
    }

    // 2. Fetch queue rank (0-indexed in Redis)
    const [rankIndex, totalWaiting] = await Promise.all([
      this.redisService.zrank(queueKey, studentId),
      this.redisService.zcard(queueKey),
    ]);

    if (rankIndex !== null) {
      const aheadInQueue = rankIndex; // 0 people ahead if rankIndex === 0
      const displayRank = rankIndex + 1; // 1-indexed human rank

      // Dynamic ETA based on turnstile throughput rate
      const throughputPerSecond =
        VWR_CONSTANTS.DEFAULTS.DEFAULT_THROUGHPUT_PER_SECOND;
      const estimatedWaitSeconds = Math.max(
        2,
        Math.ceil(aheadInQueue / throughputPerSecond),
      );

      return {
        studentId,
        tenantId,
        sessionId,
        status: QueueStatus.WAITING,
        rank: displayRank,
        aheadInQueue,
        totalWaiting,
        estimatedWaitSeconds,
        serverTime: Date.now(),
      };
    }

    // 3. Check if pass expired or student was never in queue
    const passKey = VWR_CONSTANTS.KEYS.ADMISSION_PASS(tenantId, sessionId, studentId);
    const rawPass = await this.redisService.get(passKey);
    if (rawPass) {
      const pass: StoredAdmissionPass = JSON.parse(rawPass);
      const nowSec = Math.floor(Date.now() / 1000);
      if (pass.expiresAt < nowSec) {
        return {
          studentId,
          tenantId,
          sessionId,
          status: QueueStatus.EXPIRED,
          rank: 0,
          aheadInQueue: 0,
          totalWaiting,
          estimatedWaitSeconds: 0,
          serverTime: Date.now(),
        };
      }
    }

    return {
      studentId,
      tenantId,
      sessionId,
      status: QueueStatus.NOT_FOUND,
      rank: 0,
      aheadInQueue: 0,
      totalWaiting,
      estimatedWaitSeconds: 0,
      serverTime: Date.now(),
    };
  }

  /**
   * Helper to fetch admitted student credentials and token
   */
  private async getActiveStudentStatus(
    tenantId: string,
    sessionId: string,
    studentId: string,
  ): Promise<QueueStatusResponse> {
    const passKey = VWR_CONSTANTS.KEYS.ADMISSION_PASS(tenantId, sessionId, studentId);
    const rawPass = await this.redisService.get(passKey);
    let token: string | undefined;
    let admittedAt: number | undefined;
    let expiresAt: number | undefined;

    if (rawPass) {
      try {
        const pass: StoredAdmissionPass = JSON.parse(rawPass);
        token = pass.token;
        admittedAt = pass.admittedAt;
        expiresAt = pass.expiresAt;
      } catch (e) {
        this.logger.error(`Failed to parse stored pass for ${studentId}: ${e.message}`);
      }
    }

    return {
      studentId,
      tenantId,
      sessionId,
      status: QueueStatus.ADMITTED,
      rank: 0,
      aheadInQueue: 0,
      totalWaiting: 0,
      estimatedWaitSeconds: 0,
      admissionToken: token,
      admittedAt,
      expiresAt,
      serverTime: Date.now(),
    };
  }

  /**
   * Issue and store an Admission JWT pass for an admitted student
   */
  async issueAdmissionPass(
    tenantId: string,
    sessionId: string,
    studentId: string,
    ttlSeconds: number = VWR_CONSTANTS.DEFAULTS.ADMISSION_PASS_TTL_SECONDS,
  ): Promise<string> {
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = nowSec + ttlSeconds;

    const payload: Omit<AdmissionTokenPayload, 'iat' | 'iss' | 'nonce'> = {
      studentId,
      tenantId,
      sessionId,
      admittedAt: nowSec,
      exp: expiresAt,
    };

    const token = AdmissionPassGuard.signPassToken(payload);

    const storedPass: StoredAdmissionPass = {
      token,
      studentId,
      tenantId,
      sessionId,
      admittedAt: nowSec,
      expiresAt,
    };

    const passKey = VWR_CONSTANTS.KEYS.ADMISSION_PASS(tenantId, sessionId, studentId);
    await this.redisService.setEx(passKey, ttlSeconds, JSON.stringify(storedPass));

    return token;
  }
}
