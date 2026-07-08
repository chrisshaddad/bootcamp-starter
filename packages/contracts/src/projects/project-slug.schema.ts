import { z } from 'zod';

export const projectSlugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(120, 'Slug is too long')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must contain only lowercase letters, numbers, and hyphens',
  );
