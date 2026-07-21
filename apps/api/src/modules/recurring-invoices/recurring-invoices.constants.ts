/** Name of the BullMQ queue that drives the daily recurring-invoice run. */
export const RECURRING_INVOICES_QUEUE = 'recurring-invoices';

/** Job name used for the daily generation run. */
export const RECURRING_INVOICES_RUN_JOB = 'run-daily';

/**
 * Fixed jobId for the repeatable job. BullMQ upserts a repeatable job by its
 * (name, jobId, repeat options) — reusing this id on every app restart avoids
 * accumulating duplicate schedules.
 */
export const RECURRING_INVOICES_DAILY_JOB_ID = 'recurring-invoices-daily';

/** Daily at 06:00 UTC — well ahead of the 7-day generation lead window. */
export const RECURRING_INVOICES_CRON = '0 6 * * *';
