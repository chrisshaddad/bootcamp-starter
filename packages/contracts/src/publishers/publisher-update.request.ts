import { z } from 'zod';
import { publisherCreateRequestSchema } from './publisher-create.request';

// Request for PATCH /publishers/:id
export const publisherUpdateRequestSchema =
  publisherCreateRequestSchema.partial();
export type PublisherUpdateRequest = z.infer<
  typeof publisherUpdateRequestSchema
>;
