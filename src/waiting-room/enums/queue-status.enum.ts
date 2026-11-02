/**
 * Queue Status enumeration representing student admission lifecycle
 */
export enum QueueStatus {
  /**
   * The student is in the waiting room, waiting for an admission turnstile slot.
   */
  WAITING = 'WAITING',

  /**
   * The student has been popped by the turnstile and granted an active booking pass.
   */
  ADMITTED = 'ADMITTED',

  /**
   * The student's admission window or session has expired without completion.
   */
  EXPIRED = 'EXPIRED',

  /**
   * The student has not joined or has already left/completed the queue.
   */
  NOT_FOUND = 'NOT_FOUND',
}
