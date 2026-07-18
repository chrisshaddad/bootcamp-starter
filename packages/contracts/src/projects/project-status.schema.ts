import { z } from 'zod';

export const projectStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
