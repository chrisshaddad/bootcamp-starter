import { z } from 'zod';

// Request for PATCH /users/:id/status — deactivate / reactivate an account.
// Accounts are deactivated, never deleted.
export const userStatusRequestSchema = z.object({
  isActive: z.boolean(),
});
export type UserStatusRequest = z.infer<typeof userStatusRequestSchema>;
