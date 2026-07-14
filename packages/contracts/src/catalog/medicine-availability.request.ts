import { z } from 'zod';

// Query for GET /catalog/medicines/:id/availability. `lat`/`lng` are an optional
// override; when omitted the API uses the caller's saved location. Coerced from
// query strings.
export const medicineAvailabilityRequestSchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});
export type MedicineAvailabilityRequest = z.infer<
  typeof medicineAvailabilityRequestSchema
>;
