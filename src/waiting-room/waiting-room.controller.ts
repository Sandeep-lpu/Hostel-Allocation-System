import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Post,
  Query,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, interval, from } from 'rxjs';
import { switchMap, takeWhile, distinctUntilChanged } from 'rxjs/operators';
import { WaitingRoomService } from './waiting-room.service';
import { JoinQueueDto } from './dto/join-queue.dto';
import { QueueStatusQueryDto, RevokePassDto } from './dto/queue-status.dto';
import { QueueStatusResponse } from './interfaces/queue-entry.interface';
import { StudentRateLimitGuard } from './guards/student-rate-limit.guard';
import { QueueStatus } from './enums/queue-status.enum';
import { AdmissionPassGuard } from './guards/admission-pass.guard';

/**
 * Virtual Waiting Room (VWR) HTTP & SSE Controller
 *
 * Handles student queue registration, status polling, and continuous Server-Sent Events (SSE) updates.
 */
@Controller('waiting-room')
export class WaitingRoomController {
  constructor(
    private readonly waitingRoomService: WaitingRoomService,
    private readonly admissionPassGuard: AdmissionPassGuard,
  ) {}

  /**
   * Register or re-join an authenticated student into the waiting queue.
   * Protected with per-student sliding-window rate limiting.
   */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  @UseGuards(StudentRateLimitGuard)
  async joinQueue(@Body() dto: JoinQueueDto): Promise<QueueStatusResponse> {
    return this.waitingRoomService.joinQueue(dto);
  }

  /**
   * One-time status check for the student in line.
   */
  @Get('status')
  @UseGuards(StudentRateLimitGuard)
  async getStatus(
    @Query() query: QueueStatusQueryDto,
  ): Promise<QueueStatusResponse> {
    return this.waitingRoomService.getQueueStatus(
      query.studentId,
      query.tenantId,
      query.sessionId,
    );
  }

  /**
   * Real-Time Server-Sent Events (SSE) Stream
   * Continuously pushes position updates, estimated wait time, and the signed admission pass.
   * Polling interval: 1500ms
   */
  @Sse('stream')
  streamQueueStatus(
    @Query('studentId') studentId: string,
    @Query('tenantId') tenantId: string,
    @Query('sessionId') sessionId: string,
  ): Observable<MessageEvent> {
    let finalEmissionDone = false;

    return interval(1500).pipe(
      switchMap(() =>
        from(
          this.waitingRoomService.getQueueStatus(
            studentId,
            tenantId,
            sessionId,
          ),
        ),
      ),
      // Terminate stream gracefully 1 tick after ADMITTED or EXPIRED status is delivered
      takeWhile((status) => {
        if (finalEmissionDone) {
          return false;
        }
        if (
          status.status === QueueStatus.ADMITTED ||
          status.status === QueueStatus.EXPIRED ||
          status.status === QueueStatus.NOT_FOUND
        ) {
          finalEmissionDone = true;
        }
        return true;
      }, true),
      // Map to standard W3C Server-Sent Event Message format
      switchMap((status) => [
        {
          data: status,
          type: 'queue_update',
        } as MessageEvent,
      ]),
    );
  }

  /**
   * Internal / Admin endpoint to revoke or consume an active pass
   */
  @Post('revoke')
  @HttpCode(HttpStatus.OK)
  async revokePass(
    @Body() dto: RevokePassDto,
  ): Promise<{ success: boolean; message: string }> {
    const revoked = await this.admissionPassGuard.revokePass(
      dto.tenantId,
      dto.sessionId,
      dto.studentId,
    );
    return {
      success: revoked,
      message: revoked
        ? `Pass successfully revoked for student ${dto.studentId}`
        : `Student ${dto.studentId} was not active`,
    };
  }
}
