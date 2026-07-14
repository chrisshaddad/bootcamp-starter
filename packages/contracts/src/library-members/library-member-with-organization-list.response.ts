import { z } from 'zod';
import { libraryMemberWithOrganizationResponseSchema } from './library-member-with-organization.response';

export const libraryMemberWithOrganizationListResponseSchema = z.object({
  libraryMembers: z.array(libraryMemberWithOrganizationResponseSchema),
  total: z.number(),
});
export type LibraryMemberWithOrganizationListResponse = z.infer<
  typeof libraryMemberWithOrganizationListResponseSchema
>;
