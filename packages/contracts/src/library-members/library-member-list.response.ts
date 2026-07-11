import { z } from 'zod';
import { libraryMemberResponseSchema } from './library-member.response';

// Response from GET /library-members
export const libraryMemberListResponseSchema = z.object({
  libraryMembers: z.array(libraryMemberResponseSchema),
  total: z.number(),
});
export type LibraryMemberListResponse = z.infer<
  typeof libraryMemberListResponseSchema
>;
