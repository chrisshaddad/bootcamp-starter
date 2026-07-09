import { z } from 'zod';

// Treat a blank or missing coordinate as absent so it fails the required check,
// rather than letting z.coerce turn "" / null into a valid 0 — which would
// otherwise create a branch at (0, 0) from an empty input.
const blankToUndefined = (value: unknown) =>
  value === null || (typeof value === 'string' && value.trim() === '')
    ? undefined
    : value;

// Body for creating a branch (POST /pharmacies/:id/branches) and the shape of
// the optional first branch on POST /pharmacies. Coordinates are coerced from
// the form's numeric inputs and bounded to valid WGS84 ranges. An empty phone
// normalizes to null so "no phone" is stored consistently.
export const branchCreateRequestSchema = z.object({
  name: z.string().trim().min(1, 'Branch name is required').max(150),
  phoneNumber: z
    .string()
    .trim()
    .max(20)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null)),
  address: z.string().trim().min(1, 'Address is required'),
  latitude: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ message: 'Latitude is required' })
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
  ),
  longitude: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ message: 'Longitude is required' })
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
  ),
});
export type BranchCreateRequest = z.infer<typeof branchCreateRequestSchema>;
