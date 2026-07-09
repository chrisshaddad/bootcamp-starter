import { z } from 'zod';

// Request for POST /authors
export const authorCreateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().optional(),
  nationality: z.string().optional(),
  birthYear: z.number().int().optional(),
  photoUrl: z.string().optional(),
});
export type AuthorCreateRequest = z.infer<typeof authorCreateRequestSchema>;
