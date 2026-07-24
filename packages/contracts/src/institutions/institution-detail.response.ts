import { z } from 'zod';
import { institutionStatusSchema } from './institution-status.schema';
import { institutionTypeSchema } from './institution-type.schema';
import { institutionAdminSchema } from './institution-admin.schema';
import { dateSchema } from '../common';

// Response from GET /institutions/:id
export const institutionDetailResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: institutionTypeSchema,
  status: institutionStatusSchema,
  address: z.string().nullable(),
  phone: z.string().nullable(),
  logoUrl: z.string().nullable(),
  emailNotifications: z.boolean(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  _count: z.object({
    users: z.number(),
  }),
  // Only populated on the Super Admin's findOne/updateAdminEmail views —
  // findMine (Institution Admin/Staff/Professional/Patient's "my
  // institution") omits it; those roles have no business seeing another
  // admin's email.
  admins: z.array(institutionAdminSchema).optional(),
});
export type InstitutionDetailResponse = z.infer<
  typeof institutionDetailResponseSchema
>;
