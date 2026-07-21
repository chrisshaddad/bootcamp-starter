import { z } from 'zod';

export const projectStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
  'SUSPENDED',
]);

export const projectOwnerStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
]);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectOwnerStatus = z.infer<typeof projectOwnerStatusSchema>;
