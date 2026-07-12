import { z } from 'zod';

// z.iso.date() enforces a real YYYY-MM-DD: a plain Date.parse() accepts
// impossible dates like 2025-02-30 and silently normalizes them to another day.
const calendarDateField = z
  .string()
  .trim()
  .pipe(z.iso.date('Enter a valid date'));

const optionalBatchNumber = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .transform((value) => (value && value.length > 0 ? value : null));

// Body for PATCH /stock/batches/:id. Every field is optional so a caller can
// correct just the quantity or the expiry; at least one must be present. The
// target branch is resolved from the batch itself, never from this body.
export const stockBatchUpdateRequestSchema = z
  .object({
    batchNumber: optionalBatchNumber.optional(),
    // Map blank/null to undefined before coercion: z.coerce.number() turns ''
    // and null into 0, so a blank PATCH would overwrite the stored quantity with
    // 0 instead of leaving it unchanged. Genuinely omitted quantities stay
    // optional (no update).
    quantity: z.preprocess(
      (value) =>
        value === null || (typeof value === 'string' && value.trim() === '')
          ? undefined
          : value,
      z.coerce
        .number('Enter a quantity')
        .int('Quantity must be a whole number')
        .min(0, 'Quantity cannot be negative')
        .max(1_000_000, 'Quantity is too large')
        .optional(),
    ),
    expiryDate: calendarDateField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });
export type StockBatchUpdateRequest = z.infer<
  typeof stockBatchUpdateRequestSchema
>;
