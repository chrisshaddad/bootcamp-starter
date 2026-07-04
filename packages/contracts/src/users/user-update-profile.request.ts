import { z } from 'zod';

const optionalUrlSchema = z
  .url({ error: 'Please enter a valid URL' })
  .or(z.literal(''))
  .nullish();

export const updateProfileRequestSchema = z.object({
  // Developer Profile fields
  displayName: z.string().min(1, 'Display name is required').optional(),
  publicSlug: z
    .string()
    .min(1, 'Public slug is required')
    .regex(
      /^[a-zA-Z0-9-_]+$/,
      'Slug can only contain letters, numbers, hyphens, and underscores',
    )
    .optional(),
  headline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  profilePictureUrl: optionalUrlSchema,
  linkedinUrl: optionalUrlSchema,
  personalWebsiteUrl: optionalUrlSchema,

  // Hiring Profile fields
  organizationName: z
    .string()
    .min(1, 'Organization name is required')
    .optional(),
  organizationType: z
    .enum(['COMPANY', 'AGENCY', 'INDIVIDUAL', 'FREELANCE_CLIENT'])
    .optional(),
  jobTitle: z.string().nullable().optional(),
  organizationWebsiteUrl: optionalUrlSchema,
});

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
