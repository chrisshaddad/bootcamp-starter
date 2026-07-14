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
