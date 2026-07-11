import { z } from 'zod';
import { categoryCreateRequestSchema } from './category-create.request';

// Request for PATCH /categories/:id
export const categoryUpdateRequestSchema =
  categoryCreateRequestSchema.partial();
export type CategoryUpdateRequest = z.infer<typeof categoryUpdateRequestSchema>;
