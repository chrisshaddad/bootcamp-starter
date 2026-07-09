import { z } from 'zod';
import { libraryMemberCreateRequestSchema } from './library-member-create.request';

// Request for PATCH /library-members/:id
export const libraryMemberUpdateRequestSchema =
  libraryMemberCreateRequestSchema.partial();
export type LibraryMemberUpdateRequest = z.infer<
  typeof libraryMemberUpdateRequestSchema
>;
