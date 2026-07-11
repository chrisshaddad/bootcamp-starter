import { z } from 'zod';

export const roleSchema = z.enum([
  'SUPER_ADMIN',
  'INSTITUTION_ADMIN',
  'STAFF',
  'PROFESSIONAL',
  'PATIENT',
]);
export type Role = z.infer<typeof roleSchema>;
