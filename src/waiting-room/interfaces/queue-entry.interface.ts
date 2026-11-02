import { QueueScoringMode } from '../enums/scoring-mode.enum';
import { QueueStatus } from '../enums/queue-status.enum';

/**
 * Queue Entry Metadata stored in Redis
 */
export interface QueueEntryMeta {
  studentId: string;
  tenantId: string;
  sessionId: string;
  scoringMode: QueueScoringMode;
  priorityTier: number;
  joinedAt: number;
  assignedScore: number;
}

/**
 * Real-Time Queue Status Response payload
 */
export interface QueueStatusResponse {
  studentId: string;
  tenantId: string;
  sessionId: string;
  status: QueueStatus;
  rank: number; // 1-indexed position in queue (0 if admitted or not found)
  aheadInQueue: number;
  totalWaiting: number;
  estimatedWaitSeconds: number;
  admissionToken?: string;
  admittedAt?: number;
  expiresAt?: number;
  serverTime: number;
}
