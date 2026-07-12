import { z } from 'zod';

// A calendar date from an <input type="date"> ("YYYY-MM-DD"). Kept as a string
// on the wire; the API converts it to a Date for the `@db.Date` column.
// z.iso.date() enforces a real YYYY-MM-DD: a plain Date.parse() accepts
// impossible dates like 2025-02-30 and silently normalizes them to another day.
const calendarDateField = z
  .string()
  .trim()
  .pipe(z.iso.date('Enter a valid date'));

// Optional lot number: trim, cap length, normalize blank input to null.
const optionalBatchNumber = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null));

// Body for POST /stock/batches. `branchId` is only honoured for a PHARMACY_ADMIN
// (and re-checked against their pharmacy); a STOCK_MANAGER's branch is always
// derived from their session, so the field is ignored for them. Tenant scope is
// never trusted from this body — see the service.
export const stockBatchCreateRequestSchema = z.object({
  branchId: z.uuid().optional(),
  medicineId: z.uuid('Select a medicine'),
  batchNumber: optionalBatchNumber.optional(),
  // Map blank/null to undefined before coercion: z.coerce.number() turns '' and
  // null into 0, which would slip past min(0) and create a zero-quantity batch.
  quantity: z.preprocess(
    (value) =>
      value === null || (typeof value === 'string' && value.trim() === '')
        ? undefined
        : value,
    z.coerce
      .number('Enter a quantity')
      .int('Quantity must be a whole number')
      .min(0, 'Quantity cannot be negative')
      .max(1_000_000, 'Quantity is too large'),
  ),
  expiryDate: calendarDateField,
});
export type StockBatchCreateRequest = z.infer<
  typeof stockBatchCreateRequestSchema
>;
