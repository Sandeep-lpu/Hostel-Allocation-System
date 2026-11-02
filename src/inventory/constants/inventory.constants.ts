/**
 * Inventory & Cache Architectural Constants
 */
export const INVENTORY_CONSTANTS = {
  KEYS: {
    // Redis HASH storing real-time available seat count per category: categoryCode -> count
    COUNTS_HASH: (tenantId: string, sessionId: string) => `inv:counts:${tenantId}:${sessionId}`,

    // Redis STRING storing the static catalog metadata JSON
    CATALOG_CACHE: (tenantId: string, sessionId: string) => `inv:catalog:${tenantId}:${sessionId}`,

    // Redis Pub/Sub channel for real-time inventory delta broadcasts
    UPDATES_CHANNEL: (tenantId: string, sessionId: string) => `inv:updates:${tenantId}:${sessionId}`,
  },

  DEFAULTS: {
    TENANT_ID: 'univ-delhi-hostel',
    SESSION_ID: 'hostel-allotment-2026',
    CATALOG_TTL_SECONDS: 86400, // 24 hours
    LOW_SEAT_THRESHOLD: 20,
    SSE_THROTTLE_MS: 1000, // Throttled real-time stream (max 1 update/sec)
  },
};
