import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { VwrRedisModule } from './redis/redis.module';
import { WaitingRoomService } from './waiting-room.service';
import { TurnstileWorkerService } from './turnstile.worker';
import { WaitingRoomController } from './waiting-room.controller';
import { AdmissionPassGuard } from './guards/admission-pass.guard';
import { StudentRateLimitGuard } from './guards/student-rate-limit.guard';

/**
 * Virtual Waiting Room (VWR) Phase 1 Module
 *
 * Provides:
 * - High-throughput queue scoring engine (STRICT_FIFO, FAIR_LOTTERY, MERIT_WEIGHTED)
 * - Atomic Turnstile Worker with Leaky-Bucket capacity regulation
 * - In-memory HMAC-SHA256 AdmissionPassGuard for downstream booking route protection
 * - Sliding-window per-student rate limiting
 * - Server-Sent Events (SSE) streaming for real-time rank and token delivery
 */
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    VwrRedisModule,
  ],
  controllers: [WaitingRoomController],
  providers: [
    WaitingRoomService,
    TurnstileWorkerService,
    AdmissionPassGuard,
    StudentRateLimitGuard,
  ],
  exports: [
    WaitingRoomService,
    AdmissionPassGuard,
    StudentRateLimitGuard,
    VwrRedisModule,
  ],
})
export class WaitingRoomModule {}
