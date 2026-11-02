import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QueueScoringMode } from '../enums/scoring-mode.enum';

/**
 * Join Queue Request DTO
 * Validates payload when an authenticated student enters the Virtual Waiting Room.
 */
export class JoinQueueDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsOptional()
  @IsEnum(QueueScoringMode)
  scoringMode?: QueueScoringMode = QueueScoringMode.STRICT_FIFO;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  priorityTier?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  bookingStartTime?: number; // Epoch timestamp in milliseconds for FAIR_LOTTERY lobby cutoff
}
