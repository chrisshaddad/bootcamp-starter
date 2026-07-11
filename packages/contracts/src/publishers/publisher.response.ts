import { z } from 'zod';
import { dateSchema } from '../common';

// Response shape for a single Publisher
export const publisherResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  address: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type PublisherResponse = z.infer<typeof publisherResponseSchema>;
