import { z } from 'zod';

const organizationDirectoryItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  website: z.string().nullable(),
  logoUrl: z.string().nullable(),
});
export type OrganizationDirectoryItem = z.infer<
  typeof organizationDirectoryItemSchema
>;

// Response from GET /organizations/directory - public, ACTIVE libraries only,
// deliberately lighter than the SUPER_ADMIN-only organization list/detail
// (no creator/approver info, no counts).
export const organizationDirectoryResponseSchema = z.object({
  organizations: z.array(organizationDirectoryItemSchema),
  total: z.number(),
});
export type OrganizationDirectoryResponse = z.infer<
  typeof organizationDirectoryResponseSchema
>;
