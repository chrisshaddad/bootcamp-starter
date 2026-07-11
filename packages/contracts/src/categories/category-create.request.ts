import { z } from 'zod';

// Request for POST /categories
export const categoryCreateRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});
export type CategoryCreateRequest = z.infer<typeof categoryCreateRequestSchema>;
