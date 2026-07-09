import { z } from 'zod';

export const userRoleSchema = z.enum([
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'RECEPTIONIST',
  'MEMBER',
]);
export type UserRole = z.infer<typeof userRoleSchema>;
