// Shared thresholds + helpers for the stock views. Kept here so the list page,
// the detail page, and the add-batch dialog all flag inventory the same way.

// Quantity colour bands (units): below LOW = red (critically low), below
// HEALTHY = amber (getting low), at/above HEALTHY = green (healthy).
export const LOW_QUANTITY_THRESHOLD = 15;
export const HEALTHY_QUANTITY_THRESHOLD = 30;

// A batch expiring within this many days is flagged "near expiry".
export const NEAR_EXPIRY_DAYS = 90;

export type ExpiryStatus = 'expired' | 'near' | 'ok';

// A batch expiry is a pure calendar date stored at UTC midnight (`@db.Date`, and
// serialized to the client as an ISO string). Take its YYYY-MM-DD directly —
// never reinterpret it through the local timezone, which would shift US users to
// the day before.
function toDateKey(value: string | Date): string {
  return typeof value === 'string'
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
}

// Parse a YYYY-MM-DD key into a *local* midnight Date, so day math and formatting
// operate on the calendar day the user means rather than a UTC instant.
function localDateFromKey(key: string): Date {
  const [year = 0, month = 1, day = 1] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Classify a batch/medicine expiry date relative to today. `null` (a medicine
// with no dated batches) is treated as "ok" — there's nothing to warn about.
export function expiryStatus(value: string | Date | null): ExpiryStatus {
  if (!value) return 'ok';
  const expiry = localDateFromKey(toDateKey(value));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Both are local midnights; round so a DST boundary can't skew the day count.
  const days = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return 'expired';
  if (days <= NEAR_EXPIRY_DAYS) return 'near';
  return 'ok';
}

export type QuantityLevel = 'low' | 'medium' | 'ok';

// Severity band of a stock quantity, for colour-coding: low (< 15, red), medium
// (15–29, amber), or healthy (>= 30, green).
export function quantityLevel(quantity: number): QuantityLevel {
  if (quantity < LOW_QUANTITY_THRESHOLD) return 'low';
  if (quantity < HEALTHY_QUANTITY_THRESHOLD) return 'medium';
  return 'ok';
}

export function isLowQuantity(quantity: number): boolean {
  return quantityLevel(quantity) === 'low';
}

// "12 Aug 2026" — the human-facing expiry/date format used across stock.
export function formatDate(value: string | Date): string {
  return localDateFromKey(toDateKey(value)).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// A medicine's "Brand — 500mg · Tablet" secondary line, skipping missing parts.
export function medicineSubtitle(
  form: string | null,
  dosage: string | null,
): string {
  return [dosage, form].filter(Boolean).join(' · ');
}

// An <input type="date"> value ("YYYY-MM-DD") for a given date.
export function toDateInputValue(value: string | Date): string {
  return toDateKey(value);
}

// The medicine `type` column is seeded from the MOPH workbook's "B/G" column, so
// the raw values are "B" (brand) and "G" (generic). Show a friendly label in the
// UI (mirrors the super-admin medicines form); other values pass through.
export function typeLabel(type: string): string {
  const key = type.trim().toUpperCase();
  if (key === 'B') return 'Brand';
  if (key === 'G') return 'Generic';
  return type;
}

// The inverse of `typeLabel`: turn the friendly label back into the stored code
// so the DB keeps "B"/"G" (other values pass through unchanged).
export function typeValue(label: string): string {
  const key = label.trim().toLowerCase();
  if (key === 'brand') return 'B';
  if (key === 'generic') return 'G';
  return label.trim();
}

// Suggest a batch number in the same shape the catalog is seeded with
// ("BATCH-" + 8 upper-case alphanumerics, e.g. BATCH-4K2P9XQ1). Used to prefill
// the add-batch form; the officer can always overwrite it with a printed lot.
export function generateBatchNumber(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let index = 0; index < 8; index += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BATCH-${suffix}`;
}
