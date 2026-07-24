import { z } from 'zod';

// Request for POST /library-members/:id/claim-invite
export const libraryMemberClaimInviteRequestSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase().trim()),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
});
export type LibraryMemberClaimInviteRequest = z.infer<
  typeof libraryMemberClaimInviteRequestSchema
>;
