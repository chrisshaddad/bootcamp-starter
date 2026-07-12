import { z } from 'zod';

// A calendar date from an <input type="date"> ("YYYY-MM-DD"). Kept as a string
// on the wire; the API converts it to a Date for the `@db.Date` column.
const calendarDateField = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value)),
    'Enter a valid date',
  );

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
  quantity: z.coerce
    .number('Enter a quantity')
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative')
    .max(1_000_000, 'Quantity is too large'),
  expiryDate: calendarDateField,
});
export type StockBatchCreateRequest = z.infer<
  typeof stockBatchCreateRequestSchema
>;
