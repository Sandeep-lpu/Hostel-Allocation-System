import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, isValidObjectId } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RoommateGroup, RoommateGroupDocument } from '../schemas/roommate-group.schema';
import { BedInventory, BedInventoryDocument } from '../../inventory/schemas/bed-inventory.schema';
import { RoomCategory, RoomCategoryDocument } from '../../inventory/schemas/room-category.schema';
import { StudentProfile, StudentProfileDocument } from '../../student/schemas/student-profile.schema';
import { ResidentialCart, ResidentialCartDocument } from '../../booking/schemas/residential-cart.schema';
import { VwrRedisService } from '../../waiting-room/redis/redis.service';
import { AllocateGroupRoomDto } from '../dto/allocate-group-room.dto';
import { GroupResponseDto } from '../dto/group-response.dto';
import { GroupStatus } from '../enums/group-status.enum';
import { MemberStatus } from '../enums/member-status.enum';
import { BedStatus } from '../../inventory/enums/bed-status.enum';
import { BookingType } from '../../booking/enums/booking-type.enum';
import { CartStatus } from '../../booking/enums/cart-status.enum';
import { BOOKING_CONSTANTS } from '../../booking/constants/booking.constants';
import { INVENTORY_CONSTANTS } from '../../inventory/constants/inventory.constants';

export const ATOMIC_ACQUIRE_GROUP_ROOM_LOCK_LUA = `
-- KEYS[1]: lock:group_hold:{tenantId}:{groupId}
-- KEYS[2]: inv:counts:{tenantId}:{sessionId}
-- KEYS[3..N]: lock:room:{tenantId}:{blockCode}:{roomNumber}

-- ARGV[1]: categoryCode
-- ARGV[2]: memberCount (e.g. 4)
-- ARGV[3]: ttlSeconds (600)
-- ARGV[4]: groupCode

-- Step 1: Prevent duplicate allocation for this group
if redis.call('EXISTS', KEYS[1]) == 1 then
    return { 0, 'GROUP_ALREADY_HOLDS_ACTIVE_ROOM' }
end

-- Step 2: Check room locks
for i = 3, #KEYS do
    if redis.call('EXISTS', KEYS[i]) == 1 then
        return { -2, 'ROOM_CURRENTLY_LOCKED' }
    end
end

-- Step 3: Capacity check on Redis inventory mirror
local countStr = redis.call('HGET', KEYS[2], ARGV[1])
local currentCount = tonumber(countStr or '0')
local requiredCount = tonumber(ARGV[2])

if not currentCount or currentCount < requiredCount then
    return { -1, 'CATEGORY_INSUFFICIENT_CAPACITY' }
end

-- Step 4: Atomically decrement counter by memberCount
local newCount = redis.call('HINCRBY', KEYS[2], ARGV[1], -requiredCount)

-- Step 5: Acquire locks
redis.call('SET', KEYS[1], ARGV[4], 'EX', ARGV[3])
for i = 3, #KEYS do
    redis.call('SET', KEYS[i], ARGV[4], 'EX', ARGV[3])
end

return { 1, tostring(newCount) }
`;

export const ATOMIC_ROLLBACK_GROUP_ROOM_LOCK_LUA = `
-- KEYS[1]: lock:group_hold:{tenantId}:{groupId}
-- KEYS[2]: inv:counts:{tenantId}:{sessionId}
-- KEYS[3..N]: lock:room:{tenantId}:{blockCode}:{roomNumber}
-- ARGV[1]: categoryCode
-- ARGV[2]: memberCount

redis.call('DEL', KEYS[1])
for i = 3, #KEYS do
    redis.call('DEL', KEYS[i])
end
local restoredCount = redis.call('HINCRBY', KEYS[2], ARGV[1], tonumber(ARGV[2]))
return restoredCount
`;

/**
 * Best-Fit Bin Packing & Group Allocation Protocol Engine
 *
 * Distributed Systems Rationale:
 * Solves the critical "Room Fragmentation" and "Split Group" problems:
 * 1. Best-Fit Bin Packing queries rooms where availableBedsCount >= K, sorting ASC
 *    so exact fits are consumed first, preserving untouched 4-seaters for incoming full groups.
 * 2. Tier-2 Adjacent Fallback finds closest rooms on the same floor if split is allowed.
 * 3. Atomic Multi-Bed Acquisition locks K beds and creates K isolated Split Carts in 1 transaction.
 * 4. Fault Isolation on Expiry ensures defaulting members do not cancel paid roommates' beds.
 */
@Injectable()
export class GroupAllocationService {
  private readonly logger = new Logger(GroupAllocationService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(RoommateGroup.name)
    private readonly groupModel: Model<RoommateGroupDocument>,
    @InjectModel(BedInventory.name)
    private readonly bedModel: Model<BedInventoryDocument>,
    @InjectModel(RoomCategory.name)
    private readonly categoryModel: Model<RoomCategoryDocument>,
    @InjectModel(StudentProfile.name)
    private readonly studentModel: Model<StudentProfileDocument>,
    @InjectModel(ResidentialCart.name)
    private readonly cartModel: Model<ResidentialCartDocument>,
    private readonly redisService: VwrRedisService,
    @InjectQueue(BOOKING_CONSTANTS.QUEUES.CART_EXPIRY)
    private readonly expiryQueue: Queue,
  ) {}

  /**
   * Atomic Multi-Bed Allocation for Coordinated Roommate Group
   */
  async allocateGroupRoom(
    leaderId: string,
    groupId: string,
    dto: AllocateGroupRoomDto,
  ): Promise<GroupResponseDto> {
    let group: RoommateGroupDocument | null = null;
    if (isValidObjectId(groupId)) {
      group = await this.groupModel.findById(groupId);
    }
    if (!group) {
      group = await this.groupModel.findOne({ groupCode: groupId });
    }
    if (!group) {
      throw new NotFoundException(`Roommate group '${groupId}' not found.`);
    }

    if (group.leaderStudentId !== leaderId) {
      throw new BadRequestException('Only the group leader can trigger room allocation.');
    }

    if (group.status !== GroupStatus.LOCKED_READY && group.status !== GroupStatus.FORMING) {
      throw new BadRequestException(
        `Group '${group.groupCode}' is in status '${group.status}'. Only LOCKED_READY groups can allocate rooms.`,
      );
    }

    const acceptedMembers = group.members.filter(
      (m) => m.status === MemberStatus.ACCEPTED_AND_UNDERTAKEN,
    );
    const K = group.targetSeater;

    if (acceptedMembers.length !== K) {
      throw new BadRequestException(
        `Group has ${acceptedMembers.length} accepted members, but requires exactly ${K} to allocate.`,
      );
    }

    const tenantId = group.tenantId;
    const academicSession = group.academicSession;

    // 1. Fetch Room Category details
    const category = await this.categoryModel.findOne({
      tenantId,
      academicSession,
      categoryCode: group.categoryCode,
    });

    if (!category) {
      throw new NotFoundException(`Category '${group.categoryCode}' not found.`);
    }

    // 2. Best-Fit Bin Packing Room Selection
    const allocationPlan = await this.findBestFitRooms(
      tenantId,
      academicSession,
      group.categoryCode,
      K,
      dto.allowAdjacentSplit ?? false,
    );

    if (!allocationPlan) {
      throw new ConflictException(
        `Unable to find co-located rooms for ${K} students in category '${group.categoryCode}'. ${
          !dto.allowAdjacentSplit
            ? 'Consider enabling "allowAdjacentSplit" to allow adjacent rooms on the same floor.'
            : 'All matching rooms are fully occupied.'
        }`,
      );
    }

    const targetBedIds = allocationPlan.selectedBedIds;
    const targetRoomNumbers = allocationPlan.roomNumbers;
    const targetBlockCode = allocationPlan.blockCode;

    // 3. Pre-flight Redis Multi-Lock (Group Lock + Room Locks + Atomic Counter decrement by K)
    const groupHoldKey = `lock:group_hold:${tenantId}:${group._id}`;
    const countsKey = INVENTORY_CONSTANTS.KEYS.COUNTS_HASH(tenantId, academicSession);
    const roomLockKeys = targetRoomNumbers.map(
      (room) => `lock:room:${tenantId}:${targetBlockCode}:${room}`,
    );

    const redisResult = await this.redisService.evalScript<[number, string]>(
      ATOMIC_ACQUIRE_GROUP_ROOM_LOCK_LUA,
      [groupHoldKey, countsKey, ...roomLockKeys],
      [group.categoryCode, K, BOOKING_CONSTANTS.DEFAULTS.CART_HOLD_TTL_SECONDS, group.groupCode],
    );

    const [redisCode, redisMsg] = redisResult;
    if (redisCode === 0) {
      throw new ConflictException('Group already has an active room allocation hold in progress.');
    }
    if (redisCode === -2) {
      throw new ConflictException(
        `One of the target rooms (${targetRoomNumbers.join(', ')}) is currently locked by another concurrent booking. Please retry.`,
      );
    }
    if (redisCode === -1) {
      throw new ConflictException(
        `Insufficient seats remaining for category '${group.categoryCode}' (requires ${K} beds).`,
      );
    }

    // 4. Execute Multi-Document ACID Transaction
    const lockExpiresAt = new Date(Date.now() + BOOKING_CONSTANTS.DEFAULTS.CART_HOLD_TTL_MS);
    const client = (this.connection as any).getClient?.() || (this.connection as any).client;
    const isReplicaSet =
      Boolean(client?.topology?.description?.setName) ||
      client?.topology?.description?.type === 'ReplicaSetWithPrimary';
    const session = isReplicaSet ? await this.connection.startSession() : null;

    const createdCarts: ResidentialCartDocument[] = [];

    try {
      const executeAllocationOperations = async (activeSession: any) => {
          // A. Verify all K beds are still AVAILABLE in MongoDB
        let bedQuery = this.bedModel.find({
          _id: { $in: targetBedIds },
          status: BedStatus.AVAILABLE,
        });
        if (activeSession) bedQuery = bedQuery.session(activeSession);
        const availableBeds = await bedQuery;

          if (availableBeds.length !== K) {
            throw new ConflictException(
              `Concurrency conflict: only ${availableBeds.length}/${K} target beds remain available. Retrying allocation...`,
            );
          }

          // Sort beds deterministically (Bed A, Bed B, Bed C, Bed D)
          availableBeds.sort((a, b) => a.bedLabel.localeCompare(b.bedLabel));

          // B. Assign each bed to a group member and create K Split-Carts
          for (let i = 0; i < K; i++) {
            const member = acceptedMembers[i];
            const bed = availableBeds[i];

            // Member-specific customizations
            const memberPref = dto.memberPreferences?.find(
              (p) => p.studentId === member.studentId,
            );
            const selectedMessCode =
              memberPref?.selectedMessCode || dto.defaultMessCode || 'MESS_STD_NORTH_3M';
            const includeLaundry = memberPref?.includeLaundry ?? false;
            const includeGym = memberPref?.includeGym ?? false;

            // Fetch member profile for fee diff and contact info
            let profQuery = this.studentModel.findOne({ tenantId, rollNumber: member.studentId });
            if (activeSession) profQuery = profQuery.session(activeSession);
            const memberProfile = await profQuery;

            let previousPaidFee = 0;
            let bookingType = BookingType.FRESH_ALLOCATION;
            let previousBedId = null;

            if (memberProfile?.currentAllocation?.categoryCode) {
              bookingType = BookingType.HOSTEL_CHANGE;
              let prevCatQuery = this.categoryModel.findOne({
                tenantId,
                academicSession,
                categoryCode: memberProfile.currentAllocation.categoryCode,
              });
              if (activeSession) prevCatQuery = prevCatQuery.session(activeSession);
              const prevCat = await prevCatQuery;
              previousPaidFee = prevCat?.annualFee || 0;
            }

            const baseFee = category.annualFee;
            const differentialRoomFee = Math.max(0, baseFee - previousPaidFee);
            const laundryFee = includeLaundry ? BOOKING_CONSTANTS.DEFAULTS.LAUNDRY_FEE : 0;
            const gymFee = includeGym ? BOOKING_CONSTANTS.DEFAULTS.GYM_FEE : 0;
            const totalPayable = differentialRoomFee + laundryFee + gymFee;

            // Update Bed status to LOCKED_IN_CART
            bed.status = BedStatus.LOCKED_IN_CART;
            bed.allocatedTo = memberProfile?._id || null;
            bed.lockExpiresAt = lockExpiresAt;
            bed.version = (bed.version || 0) + 1;
            await bed.save(activeSession ? { session: activeSession } : undefined);

            // Create individual Split-Cart for this member
            const idempotencyKey = `IDEMP-GRP-${group.groupCode}-${member.studentId}-${Date.now()}`;
            const cartDocs = await this.cartModel.create(
              [
                {
                  tenantId,
                  academicSession,
                  studentId: member.studentId,
                  bookingType,
                  lockedBedId: bed._id,
                  previousBedId,
                  groupId: group._id,
                  selectedCategoryCode: group.categoryCode,
                  selectedMessCode,
                  includeLaundry,
                  includeGym,
                  mobile: memberPref?.mobile || memberProfile?.mobile || '+919876543210',
                  email:
                    memberPref?.email ||
                    memberProfile?.email ||
                    `${member.studentId.toLowerCase()}@university.edu`,
                  undertakingAccepted: true,
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

            const cart = cartDocs[0];
            createdCarts.push(cart);

            // Update member's assignment in group subdocument
            const mIdx = group.members.findIndex((m) => m.studentId === member.studentId);
            if (mIdx >= 0) {
              group.members[mIdx].cartId = cart._id;
              group.members[mIdx].allocatedBedId = bed._id;
              group.members[mIdx].allocatedRoom = bed.roomNumber;
              group.members[mIdx].allocatedBedLabel = bed.bedLabel;
            }
          }

          // C. Update Group Document
          group.status = GroupStatus.HOLD_ACTIVE;
          group.allocatedBlockCode = targetBlockCode;
          group.allocatedRoomNumbers = targetRoomNumbers;
          group.holdExpiresAt = lockExpiresAt;
          group.version = (group.version || 0) + 1;
          await group.save(activeSession ? { session: activeSession } : undefined);
        };

        if (session) {
          await session.withTransaction(
            async () => {
              await executeAllocationOperations(session);
            },
            {
              readConcern: { level: 'snapshot' },
              writeConcern: { w: 'majority' },
            },
          );
        } else {
          await executeAllocationOperations(null);
        }

      // 5. Schedule BullMQ 10-Minute Cart Expiry Jobs for each roommate cart
      for (const cart of createdCarts) {
        try {
          await this.expiryQueue.add(
            'expire-cart-job',
            {
              cartId: cart._id.toString(),
              studentId: cart.studentId,
              tenantId,
              sessionId: academicSession,
              categoryCode: group.categoryCode,
            },
            {
              delay: BOOKING_CONSTANTS.DEFAULTS.CART_HOLD_TTL_MS,
              jobId: `cart-expiry-${cart._id}`,
              removeOnComplete: true,
              removeOnFail: false,
            },
          );
        } catch (queueErr: any) {
          this.logger.warn(`BullMQ group split-cart job deferred: ${queueErr.message}`);
        }
      }

      this.logger.log(
        `Group ${group.groupCode} (${K} members) successfully allocated rooms: ${targetRoomNumbers.join(', ')} in Block ${targetBlockCode}`,
      );

      return this.formatGroupResponse(group);
    } catch (err: any) {
      this.logger.error(`Group allocation transaction aborted: ${err.message}. Rolling back Redis locks...`);
      // Rollback Redis group hold, room locks, and inventory counter
      await this.redisService.evalScript(
        ATOMIC_ROLLBACK_GROUP_ROOM_LOCK_LUA,
        [groupHoldKey, countsKey, ...roomLockKeys],
        [group.categoryCode, K],
      );

      if (
        err.name === 'MongoServerError' ||
        err.code === 112 ||
        err.hasErrorLabel?.('TransientTransactionError')
      ) {
        throw new ConflictException(
          `Rooms experienced concurrent lock contention during group booking. Please retry.`,
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
   * Best-Fit Bin Packing Algorithm
   *
   * Tier 1: Single Room Full Co-location
   * Searches rooms where availableBedsCount >= K, sorting ASC (Best-Fit Bin Packing)
   * so exact matches are consumed first, preserving empty rooms for other full groups.
   *
   * Tier 2: Adjacent Rooms Fallback (Closest room numbers on the same floor)
   */
  private async findBestFitRooms(
    tenantId: string,
    academicSession: string,
    categoryCode: string,
    K: number,
    allowAdjacentSplit: boolean,
  ): Promise<{
    blockCode: string;
    roomNumbers: string[];
    selectedBedIds: any[];
  } | null> {
    // -------------------------------------------------------------------------
    // Tier 1: Single Room with >= K beds available (Exact fit prioritized)
    // -------------------------------------------------------------------------
    const singleRoomCandidates = await this.bedModel.aggregate([
      {
        $match: {
          tenantId,
          academicSession,
          categoryCode,
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
          beds: { $push: '$$ROOT' },
        },
      },
      {
        $match: {
          availableBedsCount: { $gte: K },
        },
      },
      {
        $sort: {
          availableBedsCount: 1, // Best-Fit: exact fit K first, then K+1, etc.
          '_id.roomNumber': 1,
        },
      },
      {
        $limit: 5,
      },
    ]);

    if (singleRoomCandidates.length > 0) {
      const bestRoom = singleRoomCandidates[0];
      const selectedBeds = bestRoom.beds.slice(0, K);
      return {
        blockCode: bestRoom._id.blockCode,
        roomNumbers: [bestRoom._id.roomNumber],
        selectedBedIds: selectedBeds.map((b: any) => b._id),
      };
    }

    // If Tier 1 failed and adjacent split is not allowed, stop here
    if (!allowAdjacentSplit) {
      return null;
    }

    // -------------------------------------------------------------------------
    // Tier 2: Adjacent Rooms Fallback (Same block and floor, closest room numbers)
    // -------------------------------------------------------------------------
    this.logger.log(
      `Tier 1 exact fit unavailable for K=${K}. Evaluating Tier 2 Adjacent Room Fallback...`,
    );

    const floorCandidates = await this.bedModel.aggregate([
      {
        $match: {
          tenantId,
          academicSession,
          categoryCode,
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
          beds: { $push: '$$ROOT' },
        },
      },
      {
        $sort: {
          '_id.blockCode': 1,
          '_id.floor': 1,
          '_id.roomNumber': 1,
        },
      },
    ]);

    // Group rooms by blockCode and floor
    const roomsByFloor = new Map<string, any[]>();
    for (const room of floorCandidates) {
      const key = `${room._id.blockCode}:${room._id.floor}`;
      if (!roomsByFloor.has(key)) {
        roomsByFloor.set(key, []);
      }
      roomsByFloor.get(key)!.push(room);
    }

    let bestPair: { roomA: any; roomB: any; distance: number } | null = null;

    for (const [key, rooms] of roomsByFloor.entries()) {
      if (rooms.length < 2) continue;

      for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
          const roomA = rooms[i];
          const roomB = rooms[j];
          const combinedBeds = roomA.availableBedsCount + roomB.availableBedsCount;

          if (combinedBeds >= K) {
            const numA = parseInt(roomA._id.roomNumber.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(roomB._id.roomNumber.replace(/\D/g, ''), 10) || 0;
            const distance = Math.abs(numA - numB);

            if (!bestPair || distance < bestPair.distance) {
              bestPair = { roomA, roomB, distance };
            }
          }
        }
      }
    }

    if (bestPair) {
      const allBeds = [...bestPair.roomA.beds, ...bestPair.roomB.beds];
      const selectedBeds = allBeds.slice(0, K);
      return {
        blockCode: bestPair.roomA._id.blockCode,
        roomNumbers: [bestPair.roomA._id.roomNumber, bestPair.roomB._id.roomNumber],
        selectedBedIds: selectedBeds.map((b: any) => b._id),
      };
    }

    return null;
  }

  /**
   * Helper to format detailed GroupResponseDto
   */
  private async formatGroupResponse(group: RoommateGroupDocument): Promise<GroupResponseDto> {
    const now = Date.now();
    let remainingHoldSeconds: number | null = null;

    if (group.holdExpiresAt) {
      const expTime = new Date(group.holdExpiresAt).getTime();
      remainingHoldSeconds = Math.max(0, Math.ceil((expTime - now) / 1000));
    }

    const memberSummaries: any[] = [];
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
      isReadyForAllocation: group.status === GroupStatus.LOCKED_READY,
      createdAt: (group as any).createdAt,
      updatedAt: (group as any).updatedAt,
    };
  }
}

