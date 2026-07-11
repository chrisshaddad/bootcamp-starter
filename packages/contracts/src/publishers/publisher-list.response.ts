import { z } from 'zod';
import { publisherResponseSchema } from './publisher.response';

// Response from GET /publishers
export const publisherListResponseSchema = z.object({
  publishers: z.array(publisherResponseSchema),
  total: z.number(),
});
export type PublisherListResponse = z.infer<typeof publisherListResponseSchema>;
