import { z } from 'zod';
import { institutionStatusSchema } from './institution-status.schema';
import { institutionTypeSchema } from './institution-type.schema';
import { dateSchema } from '../common';

// Institution list item
const institutionListItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  type: institutionTypeSchema,
  status: institutionStatusSchema,
  address: z.string().nullable(),
  createdAt: dateSchema,
  _count: z.object({
    users: z.number(),
  }),
});
export type InstitutionListItem = z.infer<typeof institutionListItemSchema>;

// Response from GET /institutions
export const institutionListResponseSchema = z.object({
  institutions: z.array(institutionListItemSchema),
  total: z.number(),
});
export type InstitutionListResponse = z.infer<
  typeof institutionListResponseSchema
>;
