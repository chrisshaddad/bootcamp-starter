// packages/contracts/src/projects/project-slug.schema.ts
import { z } from 'zod';

export const projectSlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-z0-9-]+$/,
    'Slug can only contain lowercase letters, numbers, and hyphens',
  );
