/**
 * Queue Scoring Engine Modes
 * Defines how priority and fairness are computed for students entering the Virtual Waiting Room.
 */
export enum QueueScoringMode {
  /**
   * STRICT_FIFO:
   * First-in, first-out ordering based strictly on high-precision microsecond epoch timestamps.
   */
  STRICT_FIFO = 'STRICT_FIFO',

  /**
   * FAIR_LOTTERY:
   * Users who arrive in the lobby prior to `bookingStartTime` receive a cryptographically
   * randomized rank score so early page-spammers get no unfair advantage.
   * Users arriving after `bookingStartTime` are appended in FIFO order behind the lottery pool.
   */
  FAIR_LOTTERY = 'FAIR_LOTTERY',

  /**
   * MERIT_WEIGHTED:
   * Score = (priorityTier * 10^13) + timestamp.
   * Allows tier-based priority (e.g. Senior Year = Tier 1, Junior = Tier 2, etc.)
   * while enforcing pure FIFO within each tier.
   */
  MERIT_WEIGHTED = 'MERIT_WEIGHTED',
}
