import { z } from 'zod';

export const projectCollaboratorSearchResponseSchema = z.strictObject({
  githubUsername: z.string(),
  avatarUrl: z.url().nullable(),
  githubPermission: z.string(),
  githubRoleName: z.string().nullable(),
  platformUser: z.strictObject({
    displayName: z.string(),
    publicSlug: z.string(),
    profilePictureUrl: z.url().nullable(),
  }),
});

export type ProjectCollaboratorSearchResponse = z.infer<
  typeof projectCollaboratorSearchResponseSchema
>;
