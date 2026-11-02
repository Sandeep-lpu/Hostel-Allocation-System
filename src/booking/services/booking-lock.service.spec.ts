import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { BookingLockService } from './booking-lock.service';
import { VwrRedisService } from '../../waiting-room/redis/redis.service';

describe('BookingLockService', () => {
  let service: BookingLockService;
  let mockRedisService: any;

  beforeEach(async () => {
    mockRedisService = {
      evalScript: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
      setEx: jest.fn().mockResolvedValue('OK'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingLockService,
        {
          provide: VwrRedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<BookingLockService>(BookingLockService);
  });

  describe('Pre-Flight Lock Acquisition', () => {
    it('should acquire lock and return new count when capacity is available', async () => {
      mockRedisService.evalScript.mockResolvedValue([1, '41']);

      const result = await service.acquirePreFlightLock(
        'tenant-1',
        'session-1',
        'STU-001',
        'STUDIO_AC_3S_PANTRY',
        'idemp-123',
      );

      expect(result.status).toBe('ACQUIRED');
      expect(result.value).toBe('41');
      expect(mockRedisService.evalScript).toHaveBeenCalled();
    });

    it('should reject if student already holds an active cart', async () => {
      mockRedisService.evalScript.mockResolvedValue([0, 'STUDENT_ALREADY_HOLDS_ACTIVE_CART']);

      await expect(
        service.acquirePreFlightLock(
          'tenant-1',
          'session-1',
          'STU-001',
          'STUDIO_AC_3S_PANTRY',
          'idemp-123',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should return SOLD_OUT when category seats reach 0', async () => {
      mockRedisService.evalScript.mockResolvedValue([-1, 'CATEGORY_SOLD_OUT']);

      const result = await service.acquirePreFlightLock(
        'tenant-1',
        'session-1',
        'STU-001',
        'STUDIO_AC_3S_PANTRY',
        'idemp-123',
      );

      expect(result.status).toBe('SOLD_OUT');
    });

    it('should return IDEMPOTENT_HIT if the same idempotency key is submitted', async () => {
      mockRedisService.evalScript.mockResolvedValue([2, 'cart-existing-id']);

      const result = await service.acquirePreFlightLock(
        'tenant-1',
        'session-1',
        'STU-001',
        'STUDIO_AC_3S_PANTRY',
        'idemp-123',
      );

      expect(result.status).toBe('IDEMPOTENT_HIT');
      expect(result.value).toBe('cart-existing-id');
    });
  });

  describe('Rollback & Release', () => {
    it('should execute atomic rollback script on transaction abort', async () => {
      mockRedisService.evalScript.mockResolvedValue(42);

      await service.rollbackLock(
        'tenant-1',
        'session-1',
        'STU-001',
        'STUDIO_AC_3S_PANTRY',
        'idemp-123',
      );

      expect(mockRedisService.evalScript).toHaveBeenCalled();
    });
  });
});

