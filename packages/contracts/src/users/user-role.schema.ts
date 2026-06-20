import { z } from 'zod';

export const userRoleSchema = z.enum([
  'SUPER_ADMIN',
  'PHARMACY_ADMIN',
  'PHARMACY_MANAGER',
  'PHARMACY_EMPLOYEE',
  'STOCK_MANAGER',
  'INQUIRY_OFFICER',
  'CLIENT',
]);
export type UserRole = z.infer<typeof userRoleSchema>;
