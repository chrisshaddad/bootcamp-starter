import { z } from 'zod';
import { dateSchema, uuidSchema } from '../common';
import { projectRoleSchema } from '../projects';
import { technologySchema } from '../technologies';

export const developerPublicProjectResponseSchema = z.strictObject({
  id: uuidSchema,
  title: z.string(),
  slug: z.string(),
  logoUrl: z.url().nullable(),
  shortDescription: z.string().nullable(),
  deploymentUrl: z.url().nullable(),
  publishedAt: dateSchema,
  role: projectRoleSchema,
  contributionRoleLabel: z.string().nullable(),
  coverImageUrl: z.url().nullable(),
  technologies: z.array(technologySchema),
});

export const developerPublicProfileResponseSchema = z.strictObject({
  userId: uuidSchema,
  publicSlug: z.string(),
  displayName: z.string(),
  headline: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  profilePictureUrl: z.url().nullable(),
  githubUsername: z.string().nullable(),
  githubUrl: z.url().nullable(),
  linkedinUrl: z.url().nullable(),
  personalWebsiteUrl: z.url().nullable(),
  stats: z.strictObject({
    publishedProjects: z.number().int().nonnegative(),
    ownedProjects: z.number().int().nonnegative(),
    collaborationProjects: z.number().int().nonnegative(),
  }),
  projects: z.array(developerPublicProjectResponseSchema),
});

export type DeveloperPublicProjectResponse = z.infer<
  typeof developerPublicProjectResponseSchema
>;
export type DeveloperPublicProfileResponse = z.infer<
  typeof developerPublicProfileResponseSchema
>;
