import { z } from 'zod';
import { dateSchema } from '../common';
import { exploreProjectResponseSchema } from '../projects';

// Same shape as an explore card, plus when it was saved, so the Saved
// Projects page can reuse ProjectCard unmodified.
export const savedProjectListItemSchema = exploreProjectResponseSchema.extend({
  savedAt: dateSchema,
  note: z.string().nullable(),
});

export type SavedProjectListItem = z.infer<typeof savedProjectListItemSchema>;

export const savedProjectsResponseSchema = z.object({
  data: z.array(savedProjectListItemSchema),
  meta: z.object({
    totalItems: z.number(),
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type SavedProjectsResponse = z.infer<typeof savedProjectsResponseSchema>;
