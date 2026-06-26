import { z } from 'zod';

export const organizationUpdateRequestSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  website: z.string().trim().url().nullable().optional(),
});

export type OrganizationUpdateRequest = z.infer<
  typeof organizationUpdateRequestSchema
>;
