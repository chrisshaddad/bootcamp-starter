import { z } from 'zod';

// Request for POST /organizations (public library self-registration).
// Creates the Organization (status PENDING) plus its owning ORG_ADMIN login user.
export const createOrganizationRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Library name must be at least 2 characters')
    .max(100, 'Library name must be at most 100 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug may only contain lowercase letters, numbers, and single hyphens',
    ),
  adminName: z
    .string()
    .trim()
    .min(2, 'Your name must be at least 2 characters')
    .max(100, 'Your name must be at most 100 characters'),
  adminEmail: z.email().transform((email) => email.toLowerCase().trim()),
});
export type CreateOrganizationRequest = z.infer<
  typeof createOrganizationRequestSchema
>;
