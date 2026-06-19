import { z } from 'zod';
import { gymStatusSchema } from './gym-status.schema';
import { dateSchema } from '../common';

const gymCreatorSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
});

const gymListItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  status: gymStatusSchema,
  website: z.string().nullable(),
  createdAt: dateSchema,
  createdBy: gymCreatorSchema,
  _count: z.object({
    users: z.number(),
  }),
});
export type GymListItem = z.infer<typeof gymListItemSchema>;

// Response from GET /gyms
export const gymListResponseSchema = z.object({
  gyms: z.array(gymListItemSchema),
  total: z.number(),
});
export type GymListResponse = z.infer<typeof gymListResponseSchema>;
