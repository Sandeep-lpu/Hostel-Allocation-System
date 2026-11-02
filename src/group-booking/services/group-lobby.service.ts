import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import * as crypto from 'crypto';
import { RoommateGroup, RoommateGroupDocument } from '../schemas/roommate-group.schema';
import { StudentProfile, StudentProfileDocument } from '../../student/schemas/student-profile.schema';
import { RoomCategory, RoomCategoryDocument } from '../../inventory/schemas/room-category.schema';
import { ResidentialCart, ResidentialCartDocument } from '../../booking/schemas/residential-cart.schema';
import { CreateGroupDto } from '../dto/create-group.dto';
import { JoinGroupDto } from '../dto/join-group.dto';
import { GroupResponseDto, GroupMemberStatusSummary } from '../dto/group-response.dto';
import { GroupStatus } from '../enums/group-status.enum';
import { MemberStatus } from '../enums/member-status.enum';
import { INVENTORY_CONSTANTS } from '../../inventory/constants/inventory.constants';

/**
 * Group Lobby & Mutual Consent Service
 *
 * Implements Phase 4:
 * - Roommate group creation with unique 6-character invite code
 * - Pre-booking mutual handshake and mandatory undertaking verification
 * - Strict gender matching enforcement
 * - Group locking for joint entry into Phase 1 Virtual Waiting Room
 */
@Injectable()
export class GroupLobbyService {
  private readonly logger = new Logger(GroupLobbyService.name);

  constructor(
    @InjectModel(RoommateGroup.name)
    private readonly groupModel: Model<RoommateGroupDocument>,
    @InjectModel(StudentProfile.name)
    private readonly studentModel: Model<StudentProfileDocument>,
    @InjectModel(RoomCategory.name)
    private readonly categoryModel: Model<RoomCategoryDocument>,
    @InjectModel(ResidentialCart.name)
    private readonly cartModel: Model<ResidentialCartDocument>,
  ) {}

  /**
   * Create a new Roommate Group
   */
  async createGroup(leaderId: string, dto: CreateGroupDto): Promise<GroupResponseDto> {
    const tenantId = dto.tenantId || INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID;
    const academicSession = dto.academicSession || INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID;

    // 1. Validate Leader Student Profile
    const leaderProfile = await this.studentModel.findOne({ tenantId, rollNumber: leaderId });
    if (!leaderProfile) {
      throw new NotFoundException(`Student profile for leader '${leaderId}' not found.`);
    }

    // 2. Enforce constraint: Student can belong to only ONE active group per session
    const existingActiveGroup = await this.groupModel.findOne({
      tenantId,
      academicSession,
      'members.studentId': leaderId,
      status: {
        $in: [
          GroupStatus.FORMING,
          GroupStatus.LOCKED_READY,
          GroupStatus.HOLD_ACTIVE,
          GroupStatus.PARTIALLY_OR_FULLY_BOOKED,
        ],
      },
    });

    if (existingActiveGroup) {
      throw new ConflictException(
        `You already belong to an active group (${existingActiveGroup.groupCode}). Leave your existing group before creating a new one.`,
      );
    }

    // 3. Validate Room Category and Seater Matching
    const category = await this.categoryModel.findOne({
      tenantId,
      academicSession,
      categoryCode: dto.categoryCode,
    });

    if (!category) {
      throw new NotFoundException(`Room category '${dto.categoryCode}' not found.`);
    }

    if (category.seaterCount !== dto.targetSeater) {
      throw new BadRequestException(
        `Category '${dto.categoryCode}' has ${category.seaterCount} seaters, but group target is ${dto.targetSeater}.`,
      );
    }

    // 4. Generate unique 6-character invite code (e.g. GRP-9A2F)
    let groupCode = '';
    let isUnique = false;
    for (let attempts = 0; attempts < 10; attempts++) {
      const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
      groupCode = `GRP-${randomHex}`;
      const exists = await this.groupModel.findOne({ tenantId, academicSession, groupCode });
      if (!exists) {
        isUnique = true;
        break;
      }
    }

    if (!isUnique) {
      groupCode = `GRP-${Date.now().toString().slice(-4)}`;
    }

    // 5. Initialize Members with Leader (Leader is auto-accepted)
    const members: any[] = [
      {
        studentId: leaderId,
        rollNumber: leaderProfile.rollNumber,
        name: leaderProfile.name,
        status: MemberStatus.ACCEPTED_AND_UNDERTAKEN,
        joinedAt: new Date(),
        cartId: null,
        allocatedBedId: null,
      },
    ];

    // 6. Pre-invite friends if requested
    if (dto.invitedRollNumbers && dto.invitedRollNumbers.length > 0) {
      const invitedRolls = [...new Set(dto.invitedRollNumbers)].filter((r) => r !== leaderId);
      if (invitedRolls.length >= dto.targetSeater) {
        throw new BadRequestException(
          `Cannot invite ${invitedRolls.length} students. Group maximum capacity is ${dto.targetSeater} (including leader).`,
        );
      }

      for (const roll of invitedRolls) {
        const friendProfile = await this.studentModel.findOne({ tenantId, rollNumber: roll });
        if (!friendProfile) {
          throw new NotFoundException(`Invited student profile for roll '${roll}' not found.`);
        }

        // Strict Gender Isolation: All roommates MUST match gender
        if (friendProfile.gender !== leaderProfile.gender) {
          throw new BadRequestException(
            `Gender mismatch: Invited student '${friendProfile.name}' (${friendProfile.gender}) does not match group gender (${leaderProfile.gender}).`,
          );
        }

        members.push({
          studentId: roll,
          rollNumber: friendProfile.rollNumber,
          name: friendProfile.name,
          status: MemberStatus.INVITED,
          joinedAt: new Date(),
          cartId: null,
          allocatedBedId: null,
        });
      }
    }

    const group = await this.groupModel.create({
      tenantId,
      academicSession,
      groupCode,
      leaderStudentId: leaderId,
      gender: leaderProfile.gender,
      targetSeater: dto.targetSeater,
      categoryCode: dto.categoryCode,
      members,
      status: GroupStatus.FORMING,
      allocatedBlockCode: '',
      allocatedRoomNumbers: [],
      version: 0,
    });

    this.logger.log(
      `Roommate Group created: ${groupCode} by leader ${leaderId} for ${dto.targetSeater}-seater ${dto.categoryCode}`,
    );

    return this.formatGroupResponse(group);
  }

  /**
   * Accept an invite and join Roommate Group
   */
  async joinGroup(
    studentId: string,
    groupCode: string,
    dto: JoinGroupDto,
  ): Promise<GroupResponseDto> {
    const tenantId = dto.tenantId || INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID;
    const academicSession = dto.academicSession || INVENTORY_CONSTANTS.DEFAULTS.SESSION_ID;

    // 1. Fetch group by invite code
    const group = await this.groupModel.findOne({
      tenantId,
      academicSession,
      groupCode: groupCode.toUpperCase().trim(),
    });

    if (!group) {
      throw new NotFoundException(`Roommate group with invite code '${groupCode}' not found.`);
    }

    if (group.status !== GroupStatus.FORMING) {
      throw new BadRequestException(
        `Group '${groupCode}' is currently in status '${group.status}' and cannot accept new members.`,
      );
    }

    // 2. Verify joining student profile
    const studentProfile = await this.studentModel.findOne({ tenantId, rollNumber: studentId });
    if (!studentProfile) {
      throw new NotFoundException(`Student profile for '${studentId}' not found.`);
    }

    // 3. Strict Gender Isolation
    if (studentProfile.gender !== group.gender) {
      throw new BadRequestException(
        `Gender mismatch: Your profile gender (${studentProfile.gender}) does not match group gender (${group.gender}).`,
      );
    }

    // 4. Verify student is not already active in another group
    const existingActiveGroup = await this.groupModel.findOne({
      tenantId,
      academicSession,
      _id: { $ne: group._id },
      'members.studentId': studentId,
      status: {
        $in: [
          GroupStatus.FORMING,
          GroupStatus.LOCKED_READY,
          GroupStatus.HOLD_ACTIVE,
          GroupStatus.PARTIALLY_OR_FULLY_BOOKED,
        ],
      },
    });

    if (existingActiveGroup) {
      throw new ConflictException(
        `You already belong to another active group (${existingActiveGroup.groupCode}). Leave that group before joining this one.`,
      );
    }

    // 5. Update or Add Member
    const memberIdx = group.members.findIndex((m) => m.studentId === studentId);
    const acceptedCount = group.members.filter(
      (m) => m.status === MemberStatus.ACCEPTED_AND_UNDERTAKEN,
    ).length;

    if (memberIdx >= 0) {
      // Member was pre-invited: transition to ACCEPTED_AND_UNDERTAKEN
      group.members[memberIdx].status = MemberStatus.ACCEPTED_AND_UNDERTAKEN;
      group.members[memberIdx].joinedAt = new Date();
    } else {
      // Member joined via group invite code
      if (acceptedCount >= group.targetSeater) {
        throw new BadRequestException(
          `Group '${groupCode}' has already reached maximum capacity of ${group.targetSeater} members.`,
        );
      }

      group.members.push({
        studentId,
        rollNumber: studentProfile.rollNumber,
        name: studentProfile.name,
        status: MemberStatus.ACCEPTED_AND_UNDERTAKEN,
        joinedAt: new Date(),
        cartId: null,
        allocatedBedId: null,
      });
    }

    await group.save();

    this.logger.log(`Student ${studentId} joined roommate group ${groupCode} successfully.`);

    return this.formatGroupResponse(group);
  }

  /**
   * Lock Roommate Group for joint Virtual Waiting Room Queue entry
   * Once locked, no new members can join and the group enters VWR as a single unit.
   */
  async lockGroupForQueue(leaderId: string, groupId: string): Promise<GroupResponseDto> {
    let group: RoommateGroupDocument | null = null;
    try {
      group = await this.groupModel.findById(groupId);
    } catch {
      // Ignore cast errors for non-ObjectId group codes
    }
    if (!group && typeof (this.groupModel as any).findOne === 'function') {
      group = await this.groupModel.findOne({ groupCode: groupId });
    }
    if (!group) {
      throw new NotFoundException(`Roommate group '${groupId}' not found.`);
    }

    if (group.leaderStudentId !== leaderId) {
      throw new BadRequestException('Only the group leader can lock the group for queue entry.');
    }

    if (group.status !== GroupStatus.FORMING) {
      throw new BadRequestException(`Group is in status '${group.status}', cannot lock.`);
    }

    const acceptedMembers = group.members.filter(
      (m) => m.status === MemberStatus.ACCEPTED_AND_UNDERTAKEN,
    );

    if (acceptedMembers.length !== group.targetSeater) {
      throw new BadRequestException(
        `Cannot lock group: only ${acceptedMembers.length} out of ${group.targetSeater} required members have accepted invites and signed the undertaking.`,
      );
    }

    group.status = GroupStatus.LOCKED_READY;
    await group.save();

    this.logger.log(
      `Roommate Group ${group.groupCode} transitioned to LOCKED_READY. Ready for VWR Queue ingestion.`,
    );

    return this.formatGroupResponse(group);
  }

  /**
   * Fetch real-time Group Status & Member Payment/Cart dashboard
   */
  async getGroupStatus(
    groupId: string,
    studentId: string,
    tenantId: string = INVENTORY_CONSTANTS.DEFAULTS.TENANT_ID,
  ): Promise<GroupResponseDto> {
    let group: RoommateGroupDocument | null = null;
    if (isValidObjectId(groupId)) {
      group = await this.groupModel.findOne({ _id: groupId, tenantId });
    }
    if (!group) {
      group = await this.groupModel.findOne({ groupCode: groupId, tenantId });
    }
    if (!group) {
      throw new NotFoundException(`Roommate group '${groupId}' not found.`);
    }

    const isMember = group.members.some((m) => m.studentId === studentId);
    if (!isMember && group.leaderStudentId !== studentId) {
      throw new BadRequestException('You are not a member of this roommate group.');
    }

    return this.formatGroupResponse(group);
  }

  /**
   * Helper to format detailed GroupResponseDto with real-time cart statuses
   */
  private async formatGroupResponse(group: RoommateGroupDocument): Promise<GroupResponseDto> {
    const now = Date.now();
    let remainingHoldSeconds: number | null = null;

    if (group.holdExpiresAt) {
      const expTime = new Date(group.holdExpiresAt).getTime();
      remainingHoldSeconds = Math.max(0, Math.ceil((expTime - now) / 1000));
    }

    const memberSummaries: GroupMemberStatusSummary[] = [];

    for (const member of group.members) {
      let cartStatus = null;
      let totalPayable = null;
      let remainingSeconds = null;

      if (member.cartId) {
        const cart = await this.cartModel.findById(member.cartId).lean();
        if (cart) {
          cartStatus = cart.status;
          totalPayable = cart.pricingBreakdown?.totalPayable || null;
          const cartExp = new Date(cart.expiresAt).getTime();
          remainingSeconds = Math.max(0, Math.ceil((cartExp - now) / 1000));
        }
      }

      memberSummaries.push({
        studentId: member.studentId,
        rollNumber: member.rollNumber,
        name: member.name,
        status: member.status,
        joinedAt: member.joinedAt,
        cartId: member.cartId ? member.cartId.toString() : null,
        cartStatus,
        allocatedBedId: member.allocatedBedId ? member.allocatedBedId.toString() : null,
        allocatedRoom: member.allocatedRoom || null,
        allocatedBedLabel: member.allocatedBedLabel || null,
        totalPayable,
        remainingSeconds,
      });
    }

    const acceptedCount = group.members.filter(
      (m) => m.status === MemberStatus.ACCEPTED_AND_UNDERTAKEN,
    ).length;

    return {
      groupId: group._id.toString(),
      tenantId: group.tenantId,
      academicSession: group.academicSession,
      groupCode: group.groupCode,
      leaderStudentId: group.leaderStudentId,
      gender: group.gender,
      targetSeater: group.targetSeater,
      categoryCode: group.categoryCode,
      status: group.status,
      allocatedBlockCode: group.allocatedBlockCode || '',
      allocatedRoomNumbers: group.allocatedRoomNumbers || [],
      members: memberSummaries,
      holdExpiresAt: group.holdExpiresAt || null,
      remainingHoldSeconds,
      isReadyForAllocation:
        acceptedCount === group.targetSeater &&
        (group.status === GroupStatus.LOCKED_READY || group.status === GroupStatus.FORMING),
      createdAt: (group as any).createdAt,
      updatedAt: (group as any).updatedAt,
    };
  }
}

