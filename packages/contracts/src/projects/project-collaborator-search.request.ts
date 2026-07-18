import { z } from 'zod';

export const projectCollaboratorSearchQuerySchema = z.strictObject({
  githubUsername: z
    .string()
    .trim()
    .min(1, 'GitHub username is required')
    .max(39, 'GitHub username is too long')
    .regex(
      /^(?!-)(?!.*--)[A-Za-z0-9-]+(?<!-)$/,
      'Enter a valid GitHub username',
    ),
});

export type ProjectCollaboratorSearchQuery = z.infer<
  typeof projectCollaboratorSearchQuerySchema
>;
