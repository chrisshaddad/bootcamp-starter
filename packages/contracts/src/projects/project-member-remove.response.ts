import { z } from 'zod';

export const removeProjectMemberResponseSchema = z.object({
  success: z.literal(true),
});

export type RemoveProjectMemberResponse = z.infer<
  typeof removeProjectMemberResponseSchema
>;
