import { bucketCountsByDay, bucketCountsByRecordType } from './stats.util';

describe('bucketCountsByDay', () => {
  it('zero-fills every day in the window when there are no dates', () => {
    const result = bucketCountsByDay([], 3, new Date('2026-07-19T12:00:00Z'));

    expect(result).toEqual([
      { date: '2026-07-17', count: 0 },
      { date: '2026-07-18', count: 0 },
      { date: '2026-07-19', count: 0 },
    ]);
  });

  it('counts multiple entries on the same day', () => {
    const result = bucketCountsByDay(
      [
        new Date('2026-07-18T01:00:00Z'),
        new Date('2026-07-18T23:00:00Z'),
        new Date('2026-07-19T09:00:00Z'),
      ],
      3,
      new Date('2026-07-19T12:00:00Z'),
    );

    expect(result).toEqual([
      { date: '2026-07-17', count: 0 },
      { date: '2026-07-18', count: 2 },
      { date: '2026-07-19', count: 1 },
    ]);
  });

  it('drops dates that fall outside the window', () => {
    const result = bucketCountsByDay(
      [new Date('2026-07-01T00:00:00Z')],
      3,
      new Date('2026-07-19T12:00:00Z'),
    );

    expect(result.reduce((sum, d) => sum + d.count, 0)).toBe(0);
  });
});

describe('bucketCountsByRecordType', () => {
  it('returns all five record types in a fixed order, zero-filled', () => {
    const result = bucketCountsByRecordType([]);

    expect(result).toEqual([
      { recordType: 'LAB_RESULT', count: 0 },
      { recordType: 'CONSULTATION', count: 0 },
      { recordType: 'PRESCRIPTION', count: 0 },
      { recordType: 'SCAN', count: 0 },
      { recordType: 'VACCINATION', count: 0 },
    ]);
  });

  it('counts occurrences per type', () => {
    const result = bucketCountsByRecordType([
      'CONSULTATION',
      'CONSULTATION',
      'SCAN',
    ]);

    expect(result).toEqual([
      { recordType: 'LAB_RESULT', count: 0 },
      { recordType: 'CONSULTATION', count: 2 },
      { recordType: 'PRESCRIPTION', count: 0 },
      { recordType: 'SCAN', count: 1 },
      { recordType: 'VACCINATION', count: 0 },
    ]);
  });
});
