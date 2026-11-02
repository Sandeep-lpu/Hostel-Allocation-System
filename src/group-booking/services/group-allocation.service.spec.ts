import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bullmq';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { GroupAllocationService } from './group-allocation.service';
import { RoommateGroup } from '../schemas/roommate-group.schema';
import { BedInventory } from '../../inventory/schemas/bed-inventory.schema';
import { RoomCategory } from '../../inventory/schemas/room-category.schema';
import { StudentProfile } from '../../student/schemas/student-profile.schema';
import { ResidentialCart } from '../../booking/schemas/residential-cart.schema';
import { VwrRedisService } from '../../waiting-room/redis/redis.service';
import { BOOKING_CONSTANTS } from '../../booking/constants/booking.constants';
import { GroupStatus } from '../enums/group-status.enum';
import { MemberStatus } from '../enums/member-status.enum';
import { Gender } from '../../inventory/enums/gender.enum';

describe('GroupAllocationService', () => {
  let service: GroupAllocationService;
  let mockGroupModel: any;
  let mockBedModel: any;
  let mockCategoryModel: any;
  let mockStudentModel: any;
  let mockCartModel: any;
  let mockRedisService: any;
  let mockExpiryQueue: any;
  let mockConnection: any;

  beforeEach(async () => {
    mockGroupModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
    };
    mockBedModel = {
      aggregate: jest.fn(),
      find: jest.fn(),
    };
    mockCategoryModel = {
      findOne: jest.fn(),
    };
    mockStudentModel = {
      findOne: jest.fn(),
    };
    mockCartModel = {
      create: jest.fn(),
      findById: jest.fn(),
    };
    mockRedisService = {
      evalScript: jest.fn(),
    };
    mockExpiryQueue = {
      add: jest.fn(),
    };
    mockConnection = {
      startSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupAllocationService,
        { provide: getModelToken(RoommateGroup.name), useValue: mockGroupModel },
        { provide: getModelToken(BedInventory.name), useValue: mockBedModel },
        { provide: getModelToken(RoomCategory.name), useValue: mockCategoryModel },
        { provide: getModelToken(StudentProfile.name), useValue: mockStudentModel },
        { provide: getModelToken(ResidentialCart.name), useValue: mockCartModel },
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: VwrRedisService, useValue: mockRedisService },
        { provide: getQueueToken(BOOKING_CONSTANTS.QUEUES.CART_EXPIRY), useValue: mockExpiryQueue },
      ],
    }).compile();

    service = module.get<GroupAllocationService>(GroupAllocationService);
  });

  it('should reject allocation if caller is not the group leader', async () => {
    mockGroupModel.findById.mockResolvedValueOnce({
      _id: 'grp_001',
      groupCode: 'GRP-1234',
      leaderStudentId: 'REAL_LEADER',
      status: GroupStatus.LOCKED_READY,
    });

    await expect(
      service.allocateGroupRoom('IMPOSTER_STUDENT', 'grp_001', {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject allocation if not all members have accepted', async () => {
    mockGroupModel.findById.mockResolvedValueOnce({
      _id: 'grp_001',
      groupCode: 'GRP-1234',
      leaderStudentId: 'LEADER_01',
      status: GroupStatus.FORMING,
      targetSeater: 3,
      members: [
        { studentId: 'LEADER_01', status: MemberStatus.ACCEPTED_AND_UNDERTAKEN },
        { studentId: 'FRIEND_01', status: MemberStatus.INVITED },
      ],
    });

    await expect(
      service.allocateGroupRoom('LEADER_01', 'grp_001', {}),
    ).rejects.toThrow(BadRequestException);
  });
});

