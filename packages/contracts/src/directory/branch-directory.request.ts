import { z } from 'zod';

// Query params for GET /directory/branches. `search` filters by pharmacy /
// branch name or address (case-insensitive). `lat`/`lng` are an optional origin
// override for "near me" ordering; when omitted, the API falls back to the
// caller's saved location, and if neither exists the list is name-ordered.
// Coerced from string query params and bounded to valid WGS84 ranges.
export const branchDirectoryRequestSchema = z.object({
  search: z.string().trim().min(1).max(200).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
export type BranchDirectoryRequest = z.infer<
  typeof branchDirectoryRequestSchema
>;
