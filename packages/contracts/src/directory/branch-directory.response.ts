import { z } from 'zod';

// One branch in the public pharmacy directory. Coordinates travel as plain
// numbers (the API converts Prisma's Decimal). `distanceKm` is the straight-line
// distance from the caller's origin, or null when no origin is known (then the
// list is name-ordered rather than nearest-first).
export const directoryBranchSchema = z.object({
  branchId: z.uuid(),
  pharmacyId: z.uuid(),
  pharmacyName: z.string(),
  branchName: z.string(),
  address: z.string(),
  phoneNumber: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  distanceKm: z.number().nullable(),
  // Distinct medicines this branch currently stocks (in-stock, non-expired) — a
  // directory-level "how much is here" signal, shown as a chip on each card.
  stockedMedicineCount: z.number().int().nonnegative(),
});
export type DirectoryBranch = z.infer<typeof directoryBranchSchema>;

// Response for GET /directory/branches. `orderedByDistance` is true when the
// list is sorted nearest-first (the caller had an origin), false when it's
// name-ordered — the client uses it to decide whether to show distances.
export const branchDirectoryResponseSchema = z.object({
  orderedByDistance: z.boolean(),
  branches: z.array(directoryBranchSchema),
  total: z.number(),
});
export type BranchDirectoryResponse = z.infer<
  typeof branchDirectoryResponseSchema
>;
