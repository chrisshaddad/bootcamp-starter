import { z } from 'zod';

export const gymStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
  'INACTIVE',
]);
export type GymStatus = z.infer<typeof gymStatusSchema>;
