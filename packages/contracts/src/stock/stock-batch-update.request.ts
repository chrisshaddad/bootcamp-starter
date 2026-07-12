import { z } from 'zod';

const calendarDateField = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value)),
    'Enter a valid date',
  );

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
    quantity: z.coerce
      .number('Enter a quantity')
      .int('Quantity must be a whole number')
      .min(0, 'Quantity cannot be negative')
      .max(1_000_000, 'Quantity is too large')
      .optional(),
    expiryDate: calendarDateField.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });
export type StockBatchUpdateRequest = z.infer<
  typeof stockBatchUpdateRequestSchema
>;
