import { z } from 'zod';

// The roles a PHARMACY_ADMIN may assign to staff in their pharmacy. A subset of
// the full userRoleSchema: it excludes SUPER_ADMIN, CLIENT, and PHARMACY_ADMIN
// (admins are provisioned by the super admin, not invited as employees). Every
// role here is branch-level, so an employee always carries a `branchId`.
export const employeeRoleSchema = z.enum([
  'PHARMACY_MANAGER',
  'PHARMACY_EMPLOYEE',
  'STOCK_MANAGER',
  'INQUIRY_OFFICER',
]);
export type EmployeeRole = z.infer<typeof employeeRoleSchema>;
