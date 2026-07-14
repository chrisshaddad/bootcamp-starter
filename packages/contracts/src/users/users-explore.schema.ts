import { z } from 'zod';

export const publicUserResponseSchema = z.object({
  id: z.string().uuid(),
  accountType: z.enum(['DEVELOPER', 'HIRING', 'SUPER_ADMIN']),
  developerProfile: z
    .object({
      id: z.string().uuid(),
      publicSlug: z.string(),
      displayName: z.string(),
      headline: z.string().nullable(),
      bio: z.string().nullable(),
      location: z.string().nullable(),
      profilePictureUrl: z.string().nullable(),
      linkedinUrl: z.string().nullable(),
      personalWebsiteUrl: z.string().nullable(),
      githubUsername: z.string().nullable(),
    })
    .nullable(),
  hiringProfile: z
    .object({
      id: z.string().uuid(),
      organizationName: z.string(),
      organizationType: z.enum([
        'COMPANY',
        'AGENCY',
        'INDIVIDUAL',
        'FREELANCE_CLIENT',
      ]),
      jobTitle: z.string().nullable(),
      linkedinUrl: z.string().nullable(),
      organizationWebsiteUrl: z.string().nullable(),
    })
    .nullable(),
});

export const usersExploreQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sort: z.enum(['latest', 'oldest', 'alphabetical']).default('latest'),
});

export type UsersExploreQuery = z.infer<typeof usersExploreQuerySchema>;

export const exploreUsersResponseSchema = z.object({
  data: z.array(publicUserResponseSchema),
  meta: z.object({
    totalItems: z.number(),
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type ExploreUsersResponse = z.infer<typeof exploreUsersResponseSchema>;
