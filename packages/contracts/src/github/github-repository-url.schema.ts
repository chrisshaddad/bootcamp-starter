import { z } from 'zod';

export const githubRepositoryUrlSchema = z
  .string()
  .trim()
  .min(1, 'GitHub repository URL is required')
  .url('Please enter a valid GitHub repository URL');

export type GithubRepositoryUrl = z.infer<typeof githubRepositoryUrlSchema>;
