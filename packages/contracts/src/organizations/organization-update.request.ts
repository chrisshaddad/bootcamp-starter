import { z } from 'zod';

export const organizationUpdateRequestSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  website: z.url().nullable().optional(),
  requiresManagerApproval: z.boolean().optional(),
});

export type OrganizationUpdateRequest = z.infer<
  typeof organizationUpdateRequestSchema
>;
