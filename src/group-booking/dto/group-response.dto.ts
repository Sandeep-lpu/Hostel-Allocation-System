import { Gender } from '../../inventory/enums/gender.enum';
import { GroupStatus } from '../enums/group-status.enum';
import { MemberStatus } from '../enums/member-status.enum';
import { CartStatus } from '../../booking/enums/cart-status.enum';

export interface GroupMemberStatusSummary {
  studentId: string;
  rollNumber: string;
  name: string;
  status: MemberStatus;
  joinedAt: Date;
  cartId: string | null;
  cartStatus: CartStatus | null;
  allocatedBedId: string | null;
  allocatedRoom: string | null;
  allocatedBedLabel: string | null;
  totalPayable: number | null;
  remainingSeconds: number | null;
}

export interface GroupResponseDto {
  groupId: string;
  tenantId: string;
  academicSession: string;
  groupCode: string;
  leaderStudentId: string;
  gender: Gender;
  targetSeater: number;
  categoryCode: string;
  status: GroupStatus;
  allocatedBlockCode: string;
  allocatedRoomNumbers: string[];
  members: GroupMemberStatusSummary[];
  holdExpiresAt?: Date | null;
  remainingHoldSeconds?: number | null;
  isReadyForAllocation: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

