import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { InventoryCacheService } from './inventory-cache.service';
import { VwrRedisService } from '../../waiting-room/redis/redis.service';
import { BedInventory } from '../schemas/bed-inventory.schema';
import { RoomCategory } from '../schemas/room-category.schema';
import { AncillaryService } from '../schemas/ancillary-service.schema';
import { AvailabilityTag } from '../enums/availability-tag.enum';

describe('InventoryCacheService', () => {
  let service: InventoryCacheService;
  let mockRedisClient: any;
  let mockRedisService: any;

  beforeEach(async () => {
    mockRedisClient = {
      hgetall: jest.fn(),
      hset: jest.fn().mockResolvedValue(1),
      hincrby: jest.fn(),
      publish: jest.fn().mockResolvedValue(1),
      duplicate: jest.fn().mockReturnValue({
        psubscribe: jest.fn((pattern, cb) => cb(null, 1)),
        on: jest.fn(),
        quit: jest.fn().mockResolvedValue('OK'),
      }),
    };

    mockRedisService = {
      getClient: jest.fn().mockReturnValue(mockRedisClient),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      pipeline: jest.fn().mockReturnValue({
        del: jest.fn().mockReturnThis(),
        hset: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    };

    const mockBedModel = {
      aggregate: jest.fn().mockResolvedValue([
        { _id: 'STUDIO_AC_3S_PANTRY', availableCount: 5 },
        { _id: 'STD_AC_2S', availableCount: 50 },
        { _id: 'STD_COOL_3S', availableCount: 0 },
      ]),
    };

    const mockCategoryModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            categoryCode: 'STUDIO_AC_3S_PANTRY',
            roomType: 'Studio Apartment Air Conditioned',
            washroomType: 'Attached Washroom',
            seaterCount: 3,
            hasPantry: true,
            annualFee: 130000,
            lowSeatThreshold: 20,
          },
          {
            categoryCode: 'STD_AC_2S',
            roomType: 'Standard Air Conditioned',
            washroomType: 'Attached Washroom',
            seaterCount: 2,
            hasPantry: false,
            annualFee: 143000,
            lowSeatThreshold: 25,
          },
          {
            categoryCode: 'STD_COOL_3S',
            roomType: 'Standard Air Cooled',
            washroomType: 'Attached Washroom',
            seaterCount: 3,
            hasPantry: false,
            annualFee: 108000,
            lowSeatThreshold: 20,
          },
        ]),
      }),
    };

    const mockAncillaryModel = {
      find: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            serviceCode: 'MESS_STD_NORTH_3M',
            serviceType: 'MESS',
            title: 'Standard Mess Three Meals',
            fee: 45000,
            isMandatory: true,
          },
        ]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryCacheService,
        {
          provide: getModelToken(BedInventory.name),
          useValue: mockBedModel,
        },
        {
          provide: getModelToken(RoomCategory.name),
          useValue: mockCategoryModel,
        },
        {
          provide: getModelToken(AncillaryService.name),
          useValue: mockAncillaryModel,
        },
        {
          provide: VwrRedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<InventoryCacheService>(InventoryCacheService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('Dynamic Availability Badges Calculation', () => {
    it('should correctly assign WAITLIST_ONLY, LIMITED_SEATS_LEFT, and AVAILABLE tags', async () => {
      // Mock cached catalog
      const cachedMetadata = {
        categories: [
          {
            categoryCode: 'STUDIO_AC_3S_PANTRY',
            roomType: 'Studio Apartment AC',
            washroomType: 'Attached',
            seaterCount: 3,
            hasPantry: true,
            annualFee: 130000,
            lowSeatThreshold: 20,
          },
          {
            categoryCode: 'STD_AC_2S',
            roomType: 'Standard AC',
            washroomType: 'Attached',
            seaterCount: 2,
            hasPantry: false,
            annualFee: 143000,
            lowSeatThreshold: 25,
          },
          {
            categoryCode: 'STD_COOL_3S',
            roomType: 'Standard Cooled',
            washroomType: 'Attached',
            seaterCount: 3,
            hasPantry: false,
            annualFee: 108000,
            lowSeatThreshold: 20,
          },
        ],
        ancillary: [],
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedMetadata));
      mockRedisClient.hgetall.mockResolvedValue({
        STUDIO_AC_3S_PANTRY: '5',   // <= 20 -> LIMITED_SEATS_LEFT
        STD_AC_2S: '50',            // > 25 -> AVAILABLE
        STD_COOL_3S: '0',           // 0 -> WAITLIST_ONLY
      });

      const catalog = await service.getLiveCatalogWithAvailability('tenant-1', 'session-1');

      const studio = catalog.categories.find((c) => c.categoryCode === 'STUDIO_AC_3S_PANTRY');
      const standard = catalog.categories.find((c) => c.categoryCode === 'STD_AC_2S');
      const cooled = catalog.categories.find((c) => c.categoryCode === 'STD_COOL_3S');

      expect(studio?.availabilityTag).toBe(AvailabilityTag.LIMITED_SEATS_LEFT);
      expect(studio?.availableSeats).toBe(5);

      expect(standard?.availabilityTag).toBe(AvailabilityTag.AVAILABLE);
      expect(standard?.availableSeats).toBe(50);

      expect(cooled?.availabilityTag).toBe(AvailabilityTag.WAITLIST_ONLY);
      expect(cooled?.availableSeats).toBe(0);
    });
  });

  describe('Atomic HINCRBY Delta Operations', () => {
    it('should decrement available seats and publish Pub/Sub event', async () => {
      mockRedisClient.hincrby.mockResolvedValue(14);

      const count = await service.decrementAvailableCount(
        'tenant-1',
        'session-1',
        'STUDIO_AC_3S_PANTRY',
        1,
      );

      expect(count).toBe(14);
      expect(mockRedisClient.hincrby).toHaveBeenCalledWith(
        'inv:counts:tenant-1:session-1',
        'STUDIO_AC_3S_PANTRY',
        -1,
      );
      expect(mockRedisClient.publish).toHaveBeenCalled();
    });

    it('should increment available seats upon cart unlock or cancellation', async () => {
      mockRedisClient.hincrby.mockResolvedValue(15);

      const count = await service.incrementAvailableCount(
        'tenant-1',
        'session-1',
        'STUDIO_AC_3S_PANTRY',
        1,
      );

      expect(count).toBe(15);
      expect(mockRedisClient.hincrby).toHaveBeenCalledWith(
        'inv:counts:tenant-1:session-1',
        'STUDIO_AC_3S_PANTRY',
        1,
      );
      expect(mockRedisClient.publish).toHaveBeenCalled();
    });
  });
});
