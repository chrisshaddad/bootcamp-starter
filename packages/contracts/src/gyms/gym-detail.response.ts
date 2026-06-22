import { z } from 'zod';
import { gymStatusSchema } from './gym-status.schema';
import { dateSchema } from '../common';

const gymUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
});

// Response from GET /gyms/:id
export const gymDetailResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  status: gymStatusSchema,
  description: z.string().nullable(),
  website: z.string().nullable(),
  phone: z.string(),
  address: z.string(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  approvedAt: dateSchema.nullable(),
  statusReason: z.string().nullable(),
  createdBy: gymUserSchema,
  approvedBy: gymUserSchema.nullable(),
  _count: z.object({
    users: z.number(),
    members: z.number(),
  }),
});
export type GymDetailResponse = z.infer<typeof gymDetailResponseSchema>;
