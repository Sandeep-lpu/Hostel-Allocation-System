import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GroupLobbyService } from './services/group-lobby.service';
import { GroupAllocationService } from './services/group-allocation.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { AllocateGroupRoomDto } from './dto/allocate-group-room.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { AdmissionPassGuard } from '../waiting-room/guards/admission-pass.guard';

/**
 * Group Roommate Co-Location HTTP Controller
 *
 * Implements Phase 4:
 * - Group lobby formation and invite code distribution
 * - Mutual consent handshake and fee undertaking verification
 * - Pre-queue readiness locking
 * - Atomic multi-bed co-location allocation & split cart creation
 * - Real-time group checkout monitor
 */
@Controller('groups')
export class GroupBookingController {
  constructor(
    private readonly lobbyService: GroupLobbyService,
    private readonly allocationService: GroupAllocationService,
  ) {}

  /**
   * 1. Create a new Roommate Group
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createGroup(
    @Req() req: any,
    @Body() dto: CreateGroupDto,
  ): Promise<GroupResponseDto> {
    const studentId: string =
      req.headers?.['x-student-id'] || req.admissionPass?.studentId || req.user?.studentId;

    return this.lobbyService.createGroup(studentId, dto);
  }

  /**
   * 2. Join Roommate Group via 6-character Invite Code
   */
  @Post(':groupCode/join')
  @HttpCode(HttpStatus.OK)
  async joinGroup(
    @Req() req: any,
    @Param('groupCode') groupCode: string,
    @Body() dto: JoinGroupDto,
  ): Promise<GroupResponseDto> {
    const studentId: string =
      req.headers?.['x-student-id'] || req.admissionPass?.studentId || req.user?.studentId;

    return this.lobbyService.joinGroup(studentId, groupCode, dto);
  }

  /**
   * 3. Lock Group for Virtual Waiting Room Queue entry
   * All members must have accepted invites and signed undertakings.
   */
  @Post(':groupId/ready')
  @HttpCode(HttpStatus.OK)
  async lockGroupForQueue(
    @Req() req: any,
    @Param('groupId') groupId: string,
  ): Promise<GroupResponseDto> {
    const studentId: string =
      req.headers?.['x-student-id'] || req.admissionPass?.studentId || req.user?.studentId;

    return this.lobbyService.lockGroupForQueue(studentId, groupId);
  }

  /**
   * 4. Atomic Multi-Bed Allocation for Coordinated Roommate Group
   * Strictly protected by AdmissionPassGuard (requires cryptographic pass from VWR).
   */
  @Post(':groupId/allocate-room')
  @UseGuards(AdmissionPassGuard)
  @HttpCode(HttpStatus.CREATED)
  async allocateRoom(
    @Req() req: any,
    @Param('groupId') groupId: string,
    @Body() dto: AllocateGroupRoomDto,
  ): Promise<GroupResponseDto> {
    const leaderId: string =
      req.admissionPass?.studentId || req.headers?.['x-student-id'] || req.user?.studentId;

    return this.allocationService.allocateGroupRoom(leaderId, groupId, dto);
  }

  /**
   * 5. Real-Time Group Status & Member Payment Dashboard
   */
  @Get(':groupId/status')
  @HttpCode(HttpStatus.OK)
  async getGroupStatus(
    @Req() req: any,
    @Param('groupId') groupId: string,
  ): Promise<GroupResponseDto> {
    const studentId: string =
      req.headers?.['x-student-id'] || req.admissionPass?.studentId || req.user?.studentId;
    const tenantId: string =
      req.headers?.['x-tenant-id'] || req.admissionPass?.tenantId || 'univ-delhi-hostel';

    return this.lobbyService.getGroupStatus(groupId, studentId, tenantId);
  }
}

