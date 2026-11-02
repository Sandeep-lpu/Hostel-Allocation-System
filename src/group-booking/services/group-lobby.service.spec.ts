import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { GroupLobbyService } from './group-lobby.service';
import { RoommateGroup } from '../schemas/roommate-group.schema';
import { StudentProfile } from '../../student/schemas/student-profile.schema';
import { RoomCategory } from '../../inventory/schemas/room-category.schema';
import { ResidentialCart } from '../../booking/schemas/residential-cart.schema';
import { Gender } from '../../inventory/enums/gender.enum';
import { GroupStatus } from '../enums/group-status.enum';
import { MemberStatus } from '../enums/member-status.enum';

describe('GroupLobbyService', () => {
  let service: GroupLobbyService;
  let mockGroupModel: any;
  let mockStudentModel: any;
  let mockCategoryModel: any;
  let mockCartModel: any;

  beforeEach(async () => {
    mockGroupModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    mockStudentModel = {
      findOne: jest.fn(),
    };

    mockCategoryModel = {
      findOne: jest.fn(),
    };

    mockCartModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupLobbyService,
        { provide: getModelToken(RoommateGroup.name), useValue: mockGroupModel },
        { provide: getModelToken(StudentProfile.name), useValue: mockStudentModel },
        { provide: getModelToken(RoomCategory.name), useValue: mockCategoryModel },
        { provide: getModelToken(ResidentialCart.name), useValue: mockCartModel },
      ],
    }).compile();

    service = module.get<GroupLobbyService>(GroupLobbyService);
  });

  it('should create a 4-seater roommate group successfully', async () => {
    mockStudentModel.findOne.mockResolvedValueOnce({
      rollNumber: 'LEADER-01',
      name: 'Leader Student',
      gender: Gender.MALE,
    });

    mockGroupModel.findOne.mockResolvedValueOnce(null); // No existing active group
    mockCategoryModel.findOne.mockResolvedValueOnce({
      categoryCode: 'STD_AC_4S',
      seaterCount: 4,
      annualFee: 103000,
    });

    const createdGroup = {
      _id: 'group_test_123',
      tenantId: 'univ-delhi-hostel',
      academicSession: 'hostel-allotment-2026',
      groupCode: 'GRP-9999',
      leaderStudentId: 'LEADER-01',
      gender: Gender.MALE,
      targetSeater: 4,
      categoryCode: 'STD_AC_4S',
      status: GroupStatus.FORMING,
      members: [
        {
          studentId: 'LEADER-01',
          rollNumber: 'LEADER-01',
          name: 'Leader Student',
          status: MemberStatus.ACCEPTED_AND_UNDERTAKEN,
          joinedAt: new Date(),
          cartId: null,
          allocatedBedId: null,
        },
      ],
    };

    mockGroupModel.create.mockResolvedValueOnce(createdGroup);

    const result = await service.createGroup('LEADER-01', {
      targetSeater: 4,
      categoryCode: 'STD_AC_4S',
      undertakingAccepted: true,
    });

    expect(result.groupId).toBe('group_test_123');
    expect(result.leaderStudentId).toBe('LEADER-01');
    expect(result.targetSeater).toBe(4);
    expect(result.members.length).toBe(1);
    expect(result.members[0].status).toBe(MemberStatus.ACCEPTED_AND_UNDERTAKEN);
  });

  it('should reject group creation if leader already in an active group', async () => {
    mockStudentModel.findOne.mockResolvedValueOnce({
      rollNumber: 'LEADER-01',
      name: 'Leader Student',
      gender: Gender.MALE,
    });

    mockGroupModel.findOne.mockResolvedValueOnce({
      groupCode: 'GRP-EXISTING',
      status: GroupStatus.FORMING,
    });

    await expect(
      service.createGroup('LEADER-01', {
        targetSeater: 4,
        categoryCode: 'STD_AC_4S',
        undertakingAccepted: true,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject joining if gender mismatches group gender', async () => {
    mockGroupModel.findOne.mockResolvedValueOnce({
      _id: 'grp_001',
      groupCode: 'GRP-MALE',
      gender: Gender.MALE,
      status: GroupStatus.FORMING,
      targetSeater: 3,
      members: [],
    });

    mockStudentModel.findOne.mockResolvedValueOnce({
      rollNumber: 'FEMALE-01',
      gender: Gender.FEMALE,
    });

    await expect(
      service.joinGroup('FEMALE-01', 'GRP-MALE', { undertakingAccepted: true }),
    ).rejects.toThrow(BadRequestException);
  });
});

