import type {
  BookCopyCondition,
  BookConditionPriceResponse,
} from '@repo/contracts';

export const CONDITION_LABELS: Record<BookCopyCondition, string> = {
  NEW: 'New',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  DAMAGED: 'Damaged',
};

// Worst to best, so condition pickers/breakdowns read as a clear scale
// rather than arbitrary insertion order.
export const CONDITION_ORDER: BookCopyCondition[] = [
  'DAMAGED',
  'POOR',
  'FAIR',
  'GOOD',
  'NEW',
];

export function sortByCondition<T extends string>(conditions: T[]): T[] {
  return [...conditions].sort(
    (a, b) =>
      CONDITION_ORDER.indexOf(a as BookCopyCondition) -
      CONDITION_ORDER.indexOf(b as BookCopyCondition),
  );
}

export function findConditionPrice(
  rows: BookConditionPriceResponse[],
  condition: BookCopyCondition,
): BookConditionPriceResponse | undefined {
  return rows.find((r) => r.condition === condition);
}

interface PriceRange {
  min: number;
  max: number;
}

export function getBuyPriceRange(
  rows: BookConditionPriceResponse[],
): PriceRange | null {
  if (rows.length === 0) return null;
  const values = rows.map((r) => Number(r.buyPrice));
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function formatPriceRange(range: PriceRange | null): string {
  if (!range) return '—';
  return range.min === range.max
    ? `$${range.min.toFixed(2)}`
    : `$${range.min.toFixed(2)} – $${range.max.toFixed(2)}`;
}
