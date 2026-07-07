import { z } from 'zod';
import { dateSchema } from '../common';

// A single medicine in the shared, platform-wide catalog (medicines are not
// tenant-scoped). `priceLbp` is a plain number on the wire — the API converts
// Prisma's Decimal before serializing so the client never parses a string.
export const medicineResponseSchema = z.object({
  id: z.uuid(),
  mophId: z.string().nullable(),
  atcCode: z.string().nullable(),
  brandName: z.string(),
  type: z.string().nullable(),
  dosage: z.string().nullable(),
  form: z.string().nullable(),
  // Ingredient names from the `Ingredient` table (via the medicine↔ingredient
  // join), which is the source of truth — not a free-text field.
  ingredients: z.array(z.string()),
  barcode: z.string().nullable(),
  priceLbp: z.number().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type MedicineResponse = z.infer<typeof medicineResponseSchema>;
