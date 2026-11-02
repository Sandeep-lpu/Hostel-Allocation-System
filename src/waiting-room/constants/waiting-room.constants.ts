/**
 * Virtual Waiting Room (VWR) Architectural Constants
 */
export const VWR_CONSTANTS = {
  // Redis Key Patterns
  KEYS: {
    // Sorted Set for waiting room queue: score -> studentId
    QUEUE: (tenantId: string, sessionId: string) => `vwr:queue:${tenantId}:${sessionId}`,

    // Set of currently active shoppers in the booking portal
    ACTIVE_SET: (tenantId: string, sessionId: string) => `vwr:active:${tenantId}:${sessionId}`,

    // Sorted Set tracking active session expirations: score = expiry epoch seconds -> studentId
    ACTIVE_EXPIRY_ZSET: (tenantId: string, sessionId: string) =>
      `vwr:active:exp:${tenantId}:${sessionId}`,

    // Hash or String storing user admission token & admission payload
    ADMISSION_PASS: (tenantId: string, sessionId: string, studentId: string) =>
      `vwr:admission:${tenantId}:${sessionId}:${studentId}`,

    // Hash storing queue entry metadata (join timestamp, mode, tier)
    ENTRY_META: (tenantId: string, sessionId: string, studentId: string) =>
      `vwr:entry:${tenantId}:${sessionId}:${studentId}`,

    // Sliding window rate limit ZSET per student: score = timestamp -> reqId
    RATE_LIMIT_STUDENT: (tenantId: string, studentId: string) =>
      `vwr:ratelimit:${tenantId}:${studentId}`,

    // Session configuration cache
    SESSION_CONFIG: (tenantId: string, sessionId: string) =>
      `vwr:session_cfg:${tenantId}:${sessionId}`,
  },

  // Turnstile defaults
  DEFAULTS: {
    // Maximum concurrent active students allowed inside the booking portal
    MAX_CONCURRENT_ACTIVE: 500,

    // Turnstile evaluation cycle in milliseconds
    TURNSTILE_INTERVAL_MS: 2000,

    // Admission pass validity TTL in seconds (10 minutes)
    ADMISSION_PASS_TTL_SECONDS: 600,

    // Max students popped per turnstile tick (to avoid blocking single-thread Redis)
    MAX_BATCH_ADMIT_PER_TICK: 100,

    // Base estimated seconds per student admission (used in dynamic ETA calculation)
    DEFAULT_THROUGHPUT_PER_SECOND: 25,

    // Lottery score upper bound for pre-lobby participants
    LOTTERY_MAX_SCORE: 1_000_000_000,

    // Timestamp offset applied for FIFO participants after booking startTime
    POST_LOBBY_FIFO_OFFSET: 2_000_000_000_000_000,

    // Tier multiplier for MERIT_WEIGHTED (allows 10^13 separation)
    MERIT_TIER_MULTIPLIER: 10_000_000_000_000,
  },

  // Sliding Window Rate Limiting Defaults
  RATE_LIMIT: {
    WINDOW_MS: 60_000, // 1 minute window
    MAX_REQUESTS: 60, // Max 60 requests per minute per student
  },

  // Injection Tokens
  REDIS_CLIENT: 'VWR_REDIS_CLIENT',
  JWT_SECRET: process.env.VWR_JWT_SECRET || 'vwr_super_secure_distributed_engine_secret_2026',
};
