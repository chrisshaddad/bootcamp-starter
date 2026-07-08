import { z } from 'zod';

// Optional free-text field: trims, enforces a max length, and normalizes blank
// input ('' from an empty form control) to null so we never store empty strings.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null));

// Price arrives from the form as a string. Coerce to a non-negative number and
// treat a blank value as "no price". A non-numeric string is passed through so
// `z.number()` rejects it with a friendly message.
const priceField = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}, z.number('Enter a valid price').nonnegative('Price cannot be negative').max(9_999_999_999, 'Price is too large').nullable());

// Body for POST /medicines. Only `brandName` is required; everything else —
// including the MOPH id, ATC code, and barcode — is optional and editable by a
// super admin. Barcode uniqueness is enforced by the database.
export const medicineCreateRequestSchema = z.object({
  brandName: z.string().trim().min(1, 'Brand name is required').max(200),
  mophId: optionalText(100),
  atcCode: optionalText(20),
  type: optionalText(20),
  dosage: optionalText(100),
  form: optionalText(50),
  // Ingredient names to link via the `Ingredient` / `MedicineIngredient`
  // tables. The API creates any that don't exist yet and reconciles the links.
  ingredients: z.array(z.string().trim().min(1).max(200)).default([]),
  barcode: optionalText(100),
  priceLbp: priceField,
});
export type MedicineCreateRequest = z.infer<typeof medicineCreateRequestSchema>;
