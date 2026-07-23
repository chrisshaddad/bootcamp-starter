import { z } from 'zod';

/**
 * Additive assign: adds the given member IDs to the group.
 * Already-assigned members are ignored; does not remove existing memberships.
 */
export const groupMembersAssignRequestSchema = z.object({
  memberIds: z.array(z.uuid()).min(1),
});
export type GroupMembersAssignRequest = z.infer<
  typeof groupMembersAssignRequestSchema
>;
