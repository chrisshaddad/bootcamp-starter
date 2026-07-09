import { z } from 'zod';
import { dateSchema } from '../common';

// Response shape for a single Author
export const authorResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string(),
  bio: z.string().nullable(),
  nationality: z.string().nullable(),
  birthYear: z.number().nullable(),
  photoUrl: z.string().nullable(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type AuthorResponse = z.infer<typeof authorResponseSchema>;
