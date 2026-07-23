export const DUE_REMINDERS_QUEUE = 'due-reminders';

export const DUE_REMINDERS_JOBS = {
  SCAN: 'scan-due-reminders',
};

export const DUE_REMINDER_SCHEDULER_ID = 'due-reminders-daily-scan';

// Cron pattern for BullMQ's upsertJobScheduler: every day at 06:00 UTC.
// There's no per-org timezone concept anywhere in the schema, so this is a
// single global schedule rather than one per organization.
export const DUE_REMINDER_CRON_PATTERN = '0 6 * * *';
