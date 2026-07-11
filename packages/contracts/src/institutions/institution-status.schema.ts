import { z } from 'zod';

export const institutionStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
  'INACTIVE',
]);
export type InstitutionStatus = z.infer<typeof institutionStatusSchema>;
