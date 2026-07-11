import { z } from 'zod';
import { institutionStatusSchema } from './institution-status.schema';
import { institutionTypeSchema } from './institution-type.schema';
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
});
export type InstitutionDetailResponse = z.infer<
  typeof institutionDetailResponseSchema
>;
