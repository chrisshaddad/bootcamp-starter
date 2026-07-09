import { z } from 'zod';

// Request for POST /publishers
export const publisherCreateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
});
export type PublisherCreateRequest = z.infer<
  typeof publisherCreateRequestSchema
>;
