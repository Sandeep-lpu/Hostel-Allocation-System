/**
 * Inventory Delta Broadcast Event Payload
 * Emitted over Redis Pub/Sub and relayed via Server-Sent Events (SSE)
 */
export interface InventoryDeltaEvent {
  tenantId: string;
  sessionId: string;
  categoryCode: string;
  availableSeats: number;
  delta: number;
  timestamp: number;
}
