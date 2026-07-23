import { z } from 'zod';

export const organizationCreateRequestSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(1000).optional(),
  website: z.url().optional(),
  requiresManagerApproval: z.boolean().optional(),
  adminName: z.string().min(2).max(100),
  adminEmail: z.email(),
});

export type OrganizationCreateRequest = z.infer<
  typeof organizationCreateRequestSchema
>;
