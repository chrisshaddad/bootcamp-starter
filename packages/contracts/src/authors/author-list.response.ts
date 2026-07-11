import { z } from 'zod';
import { authorResponseSchema } from './author.response';

// Response from GET /authors
export const authorListResponseSchema = z.object({
  authors: z.array(authorResponseSchema),
  total: z.number(),
});
export type AuthorListResponse = z.infer<typeof authorListResponseSchema>;
