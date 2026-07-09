import { z } from 'zod';
import { authorCreateRequestSchema } from './author-create.request';

// Request for PATCH /authors/:id
export const authorUpdateRequestSchema = authorCreateRequestSchema.partial();
export type AuthorUpdateRequest = z.infer<typeof authorUpdateRequestSchema>;
