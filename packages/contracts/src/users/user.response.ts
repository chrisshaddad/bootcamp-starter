import { z } from 'zod';
import { accountTypeSchema } from './user-role.schema';

export const developerProfileSchema = z.object({
  id: z.string(),
  publicSlug: z.string(),
  displayName: z.string(),
  headline: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  profilePictureUrl: z.string().nullable().optional(),
  githubUsername: z.string().nullable().optional(),
});

export const hiringProfileSchema = z.object({
  id: z.string(),
  organizationName: z.string(),
  organizationType: z.enum(['COMPANY', 'AGENCY', 'INDIVIDUAL', 'FREELANCE_CLIENT']),
  jobTitle: z.string().nullable().optional(),
});

export const userResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  accountType: accountTypeSchema,
  isConfirmed: z.boolean(),
  developerProfile: developerProfileSchema.nullable().optional(),
  hiringProfile: hiringProfileSchema.nullable().optional(),
});

export type UserResponse = z.infer<typeof userResponseSchema>;