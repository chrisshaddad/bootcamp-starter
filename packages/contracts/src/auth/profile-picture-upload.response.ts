import { z } from 'zod';

export const PROFILE_PICTURE_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const PROFILE_PICTURE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const profilePictureUploadResponseSchema = z.object({
  profilePictureUrl: z.string().url(),
});

export type ProfilePictureUploadResponse = z.infer<
  typeof profilePictureUploadResponseSchema
>;
