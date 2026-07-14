import { z } from 'zod';

// Query params for GET /directory/branches. `search` filters by pharmacy /
// branch name or address (case-insensitive). `lat`/`lng` are an optional origin
// override for "near me" ordering; when omitted, the API falls back to the
// caller's saved location, and if neither exists the list is name-ordered.
// Coerced from string query params and bounded to valid WGS84 ranges.
//
// A partial override (one coordinate without the other) is rejected: it would
// otherwise mix the supplied value with the caller's saved counterpart and skew
// the distance ordering. Send both, or neither.
export const branchDirectoryRequestSchema = z
  .object({
    search: z.string().trim().min(1).max(200).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
  })
  .refine((data) => (data.lat === undefined) === (data.lng === undefined), {
    message: 'Provide both lat and lng, or neither.',
    path: ['lat'],
  });
export type BranchDirectoryRequest = z.infer<
  typeof branchDirectoryRequestSchema
>;
