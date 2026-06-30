import { z } from 'zod';

export const userStatusSchema = z.enum([
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'PENDING',
]);
export type UserStatus = z.infer<typeof userStatusSchema>;
