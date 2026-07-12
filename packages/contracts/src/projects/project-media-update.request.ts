import { z } from 'zod';

export const projectMediaUpdateSchema = z.object({
  caption: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export type ProjectMediaUpdateRequest = z.infer<
  typeof projectMediaUpdateSchema
>;
