import type { RecordType } from '@repo/db';
import type { DailyCount, RecordTypeCount } from '@repo/contracts';

export const ALL_RECORD_TYPES: RecordType[] = [
  'LAB_RESULT',
  'CONSULTATION',
  'PRESCRIPTION',
  'SCAN',
  'VACCINATION',
];

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Buckets a list of timestamps into daily counts covering the `days`-day
 * window ending on `endDate` (inclusive), zero-filling days with no entries
 * so charts render a continuous axis instead of gaps.
 */
export function bucketCountsByDay(
  dates: Date[],
  days: number,
  endDate: Date,
): DailyCount[] {
  const counts = new Map<string, number>();

  for (let i = 0; i < days; i++) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - (days - 1 - i));
    counts.set(toDateKey(d), 0);
  }

  for (const date of dates) {
    const key = toDateKey(date);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}

/** Buckets record types into fixed-order counts, zero-filling absent types. */
export function bucketCountsByRecordType(
  recordTypes: RecordType[],
): RecordTypeCount[] {
  const counts = new Map<RecordType, number>(
    ALL_RECORD_TYPES.map((type) => [type, 0]),
  );

  for (const type of recordTypes) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }

  return ALL_RECORD_TYPES.map((recordType) => ({
    recordType,
    count: counts.get(recordType) ?? 0,
  }));
}
