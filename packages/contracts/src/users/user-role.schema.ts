import { z } from 'zod';

export const userRoleSchema = z.enum([
  'SUPER_ADMIN',
  'ORG_ADMIN',
  'HR',
  'EMPLOYEE',
]);
export type UserRole = z.infer<typeof userRoleSchema>;
