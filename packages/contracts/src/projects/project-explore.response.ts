import { z } from 'zod';
import { publicProjectResponseSchema } from './project-public.response';
import { technologySchema } from '../technologies';

export const exploreProjectCreatorSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  profilePictureUrl: z.string().nullable(),
  githubUsername: z.string().nullable(),
});

export type ExploreProjectCreator = z.infer<typeof exploreProjectCreatorSchema>;

export const exploreProjectContributorSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  profilePictureUrl: z.string().nullable(),
});

export type ExploreProjectContributor = z.infer<
  typeof exploreProjectContributorSchema
>;

export const exploreProjectResponseSchema = publicProjectResponseSchema.extend({
  repositoryUrl: z.string().nullable(),
  createdBy: exploreProjectCreatorSchema.nullable(),
  technologies: z.array(technologySchema).default([]),
  contributors: z.array(exploreProjectContributorSchema).default([]),
  contributorCount: z.number().int(),
});

export type ExploreProjectResponse = z.infer<
  typeof exploreProjectResponseSchema
>;

export const exploreProjectsResponseSchema = z.object({
  data: z.array(exploreProjectResponseSchema),
  meta: z.object({
    totalItems: z.number(),
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type ExploreProjectsResponse = z.infer<
  typeof exploreProjectsResponseSchema
>;
