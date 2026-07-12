import { z } from 'zod';

export const prescriptionRouteSchema = z.enum([
  'ORAL',
  'IV',
  'TOPICAL',
  'INHALATION',
  'OTHER',
]);
export type PrescriptionRoute = z.infer<typeof prescriptionRouteSchema>;
