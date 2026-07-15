import type { AttendanceStatus } from '@repo/contracts';

export const ATTENDANCE_GRACE_PERIOD_MS = 30 * 60 * 1000;

/**
 * Resolves the effective attendance status for stats.
 * A PENDING record on a past event past the grace window counts as SKIPPED,
 * mirroring the auto-skip rule enforced when attendance pages load.
 */
export function resolveEffectiveStatus(
  status: AttendanceStatus,
  startsAt: Date,
  now: Date = new Date(),
): AttendanceStatus {
  if (status !== 'PENDING') {
    return status;
  }

  const deadline = startsAt.getTime() + ATTENDANCE_GRACE_PERIOD_MS;
  return now.getTime() >= deadline ? 'SKIPPED' : 'PENDING';
}
