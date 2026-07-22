import { z } from 'zod';

// Request for PATCH /organizations/current — ORG_ADMIN self-service editing of
// their own library's branding/profile. All fields optional (partial update);
// status is NOT editable here (that stays a SUPER_ADMIN action).
export const organizationUpdateRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Library name must be at least 2 characters')
    .max(100, 'Library name must be at most 100 characters')
    .optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug may only contain lowercase letters, numbers, and single hyphens',
    )
    .optional(),
  description: z.string().trim().max(2000).optional(),
  // URL inputs (not file uploads); kept lenient like the publisher contract.
  website: z.string().trim().max(200).optional(),
  logoUrl: z.string().trim().max(500).optional(),
});
export type OrganizationUpdateRequest = z.infer<
  typeof organizationUpdateRequestSchema
>;
