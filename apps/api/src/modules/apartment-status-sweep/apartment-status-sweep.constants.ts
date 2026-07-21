/** Name of the BullMQ queue that drives the daily apartment-status sweep. */
export const APARTMENT_STATUS_SWEEP_QUEUE = 'apartment-status-sweep';

/** Job name used for the daily sweep run. */
export const APARTMENT_STATUS_SWEEP_RUN_JOB = 'run-daily';

/**
 * Fixed jobId for the repeatable job. BullMQ upserts a repeatable job by its
 * (name, jobId, repeat options) — reusing this id on every app restart avoids
 * accumulating duplicate schedules.
 */
export const APARTMENT_STATUS_SWEEP_DAILY_JOB_ID =
  'apartment-status-sweep-daily';

/** Daily at 07:00 UTC — an hour after the recurring-invoices run. */
export const APARTMENT_STATUS_SWEEP_CRON = '0 7 * * *';
