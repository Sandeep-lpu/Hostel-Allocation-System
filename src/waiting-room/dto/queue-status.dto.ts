import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Query DTO for querying student waiting room status
 */
export class QueueStatusQueryDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

/**
 * Revoke Pass DTO used by booking service when allocation completes
 */
export class RevokePassDto {
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  sessionId: string;
}
