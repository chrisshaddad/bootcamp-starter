/** Name of the BullMQ queue that delivers in-app notifications. */
export const NOTIFICATIONS_QUEUE = 'notifications';

/**
 * Dead-letter queue. Notification jobs that exhaust all retry attempts are
 * copied here (payload + failure reason) so a repeatedly-failing delivery lands
 * somewhere actionable for ops instead of vanishing. It has no worker — jobs
 * sit durably as `waiting` for inspection / manual replay.
 */
export const NOTIFICATIONS_DEAD_LETTER_QUEUE = 'notifications-dead-letter';

/** Job name used when enqueuing a delivery job. */
export const DELIVER_NOTIFICATION_JOB = 'deliver';

/** Job name used when copying a terminally-failed job to the dead-letter queue. */
export const DEAD_LETTER_JOB = 'dead-letter';

/** Payload stored on the dead-letter queue for a terminally-failed job. */
export interface DeadLetterJobData {
  /** The original notification payload that failed to deliver. */
  payload: NotificationJobData;
  /** BullMQ id of the original (failed) job. */
  originalJobId: string;
  /** Last failure reason reported by BullMQ. */
  failedReason: string;
  /** How many attempts were made before giving up. */
  attemptsMade: number;
}

/**
 * Payload enqueued onto the notifications queue. The worker persists it as a
 * Notification row (and, in future, fans out to email / push).
 */
export interface NotificationJobData {
  /** Organisation the notification belongs to. */
  orgId: string;
  /** Recipient — a Keycloak `sub`. */
  userId: string;
  /** Machine-readable key, e.g. 'support_ticket.acknowledged'. */
  type: string;
  title: string;
  body?: string;
  /** Small JSON payload for deep-linking (e.g. { ticketId }). */
  data?: Record<string, unknown>;
}
