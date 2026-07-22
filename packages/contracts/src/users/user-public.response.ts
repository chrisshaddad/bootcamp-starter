import { z } from 'zod';
import { accountTypeSchema } from './user-role.schema';
import { developerProfileSchema, hiringProfileSchema } from './user.response';

const publicDeveloperProfileSchema = developerProfileSchema.omit({
  profilePictureOriginalUrl: true,
  profilePictureCropZoom: true,
  profilePictureCropX: true,
  profilePictureCropY: true,
});

// We omit sensitive details like the `email` for the public endpoint response
export const publicUserResponseSchema = z.object({
  id: z.string().uuid(),
  accountType: accountTypeSchema,
  developerProfile: publicDeveloperProfileSchema.nullable().optional(),
  hiringProfile: hiringProfileSchema.nullable().optional(),
});

export type PublicUserResponse = z.infer<typeof publicUserResponseSchema>;
