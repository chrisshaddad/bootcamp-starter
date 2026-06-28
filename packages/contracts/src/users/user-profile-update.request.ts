import { z } from 'zod';

export const userProfileUpdateRequestSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  profilePictureUrl: z.string().trim().min(1).nullable().optional(),
  phoneNumber: z.string().trim().max(20).nullable().optional(),
  bio: z.string().trim().max(1000).nullable().optional(),
  street1: z.string().trim().max(255).nullable().optional(),
  street2: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
});

export type UserProfileUpdateRequest = z.infer<
  typeof userProfileUpdateRequestSchema
>;
