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

// Roles that belong to a pharmacy and therefore require a `pharmacyId`.
// SUPER_ADMIN (platform) and CLIENT (end user) are not pharmacy-scoped.
export const PHARMACY_SCOPED_ROLES = [
  'PHARMACY_ADMIN',
  'PHARMACY_MANAGER',
  'PHARMACY_EMPLOYEE',
  'STOCK_MANAGER',
  'INQUIRY_OFFICER',
] as const satisfies readonly UserRole[];

export function isPharmacyScopedRole(role: UserRole): boolean {
  return (PHARMACY_SCOPED_ROLES as readonly UserRole[]).includes(role);
}
