import { z } from 'zod';
import { dateSchema } from '../common';

// One pharmacy branch that currently stocks a medicine, with its distance from
// the caller and a rollup of its in-stock batches. Coordinates travel as plain
// numbers (the API converts Prisma's Decimal).
export const branchAvailabilitySchema = z.object({
  branchId: z.uuid(),
  pharmacyId: z.uuid(),
  pharmacyName: z.string(),
  branchName: z.string(),
  address: z.string(),
  phoneNumber: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  // Straight-line km from the caller's origin; null when no origin is known.
  distanceKm: z.number().nullable(),
  totalQuantity: z.number().int(),
  batchCount: z.number().int(),
  nearestExpiry: dateSchema.nullable(),
});
export type BranchAvailability = z.infer<typeof branchAvailabilitySchema>;

// Response for GET /catalog/medicines/:id/availability. `hasLocation` is false
// when the caller has neither an override nor a saved location — the client
// shows a "set your location" prompt instead of an unordered list. When true,
// `branches` are the in-stock branches sorted nearest-first.
export const medicineAvailabilityResponseSchema = z.object({
  hasLocation: z.boolean(),
  branches: z.array(branchAvailabilitySchema),
});
export type MedicineAvailabilityResponse = z.infer<
  typeof medicineAvailabilityResponseSchema
>;
