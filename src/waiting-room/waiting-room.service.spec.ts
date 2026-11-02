import { Test, TestingModule } from '@nestjs/testing';
import { WaitingRoomService } from './waiting-room.service';
import { VwrRedisService } from './redis/redis.service';
import { QueueScoringMode } from './enums/scoring-mode.enum';
import { VWR_CONSTANTS } from './constants/waiting-room.constants';

describe('WaitingRoomService', () => {
  let service: WaitingRoomService;
  let redisService: Partial<VwrRedisService>;

  const mockRedisClient = {
    sadd: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    redisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient as any),
      sismember: jest.fn().mockResolvedValue(0),
      zrank: jest.fn().mockResolvedValue(null),
      zaddNx: jest.fn().mockResolvedValue(1),
      zcard: jest.fn().mockResolvedValue(10),
      setEx: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitingRoomService,
        {
          provide: VwrRedisService,
          useValue: redisService,
        },
      ],
    }).compile();

    service = module.get<WaitingRoomService>(WaitingRoomService);
  });

  describe('Fairness & Scoring Calculation Engine', () => {
    it('should compute high-precision microsecond score for STRICT_FIFO', () => {
      const before = Date.now() * 1000;
      const score = service.computeScore(QueueScoringMode.STRICT_FIFO);
      const after = (Date.now() + 1) * 1000 + 1000;

      expect(score).toBeGreaterThanOrEqual(before);
      expect(score).toBeLessThanOrEqual(after);
    });

    it('should compute cryptographically randomized score within pre-lobby window for FAIR_LOTTERY', () => {
      const futureStartTime = Date.now() + 100000; // Future booking start
      const score1 = service.computeScore(
        QueueScoringMode.FAIR_LOTTERY,
        1,
        futureStartTime,
      );
      const score2 = service.computeScore(
        QueueScoringMode.FAIR_LOTTERY,
        1,
        futureStartTime,
      );

      expect(score1).toBeGreaterThanOrEqual(1);
      expect(score1).toBeLessThanOrEqual(VWR_CONSTANTS.DEFAULTS.LOTTERY_MAX_SCORE);
      expect(score2).toBeGreaterThanOrEqual(1);
      expect(score2).toBeLessThanOrEqual(VWR_CONSTANTS.DEFAULTS.LOTTERY_MAX_SCORE);
      // Both random scores within lobby should be independent and random
    });

    it('should sequence post-lobby joins behind lottery pool in FIFO order for FAIR_LOTTERY', () => {
      const pastStartTime = Date.now() - 10000; // Booking already started
      const score = service.computeScore(
        QueueScoringMode.FAIR_LOTTERY,
        1,
        pastStartTime,
      );

      // Must be strictly greater than POST_LOBBY_FIFO_OFFSET
      expect(score).toBeGreaterThan(VWR_CONSTANTS.DEFAULTS.POST_LOBBY_FIFO_OFFSET);
    });

    it('should prioritize seniority tiers while preserving FIFO within same tier for MERIT_WEIGHTED', () => {
      const tier1Score = service.computeScore(QueueScoringMode.MERIT_WEIGHTED, 1);
      const tier2Score = service.computeScore(QueueScoringMode.MERIT_WEIGHTED, 2);
      const tier3Score = service.computeScore(QueueScoringMode.MERIT_WEIGHTED, 3);

      // Tier 1 score < Tier 2 score < Tier 3 score (Lower score = served first in ZPOPMIN)
      expect(tier1Score).toBeLessThan(tier2Score);
      expect(tier2Score).toBeLessThan(tier3Score);

      const tierDifference = tier2Score - tier1Score;
      expect(tierDifference).toBeGreaterThanOrEqual(VWR_CONSTANTS.DEFAULTS.MERIT_TIER_MULTIPLIER - 1000);
    });
  });

  describe('Idempotency & Refresh Resilience (ZADD NX)', () => {
    it('should retain existing rank when student refreshes the browser', async () => {
      // Simulate student already in queue at rank 4
      jest.spyOn(redisService, 'zrank').mockResolvedValue(4);
      jest.spyOn(redisService, 'zcard').mockResolvedValue(50);

      const response = await service.joinQueue({
        studentId: 'STU-REFRESH-TEST',
        tenantId: 'tenant-1',
        sessionId: 'session-1',
        scoringMode: QueueScoringMode.STRICT_FIFO,
      });

      expect(response.rank).toBe(5); // 1-indexed display rank
      expect(response.aheadInQueue).toBe(4);
      expect(response.totalWaiting).toBe(50);
      expect(redisService.zaddNx).not.toHaveBeenCalled(); // NX prevented duplicate insertion
    });
  });
});
