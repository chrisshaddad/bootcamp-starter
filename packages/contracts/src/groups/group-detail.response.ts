import { z } from 'zod';
import { dateSchema } from '../common';
import { memberRoleSchema } from '../members/member-role.schema';

export const groupDetailMemberSchema = z.object({
  id: z.uuid(),
  username: z.string(),
  role: memberRoleSchema,
});
export type GroupDetailMember = z.infer<typeof groupDetailMemberSchema>;

export const groupDetailResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  organizationId: z.uuid(),
  memberCount: z.number(),
  members: z.array(groupDetailMemberSchema),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type GroupDetailResponse = z.infer<typeof groupDetailResponseSchema>;
