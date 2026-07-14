import { z } from 'zod';
import { accountTypeSchema } from './user-role.schema';
import { developerProfileSchema, hiringProfileSchema } from './user.response';
// We omit sensitive details like the email for the public endpoint response
export const publicUserResponseSchema = z.object({
  id: z.string().uuid(),
  accountType: accountTypeSchema,
  developerProfile: developerProfileSchema.nullable().optional(),
  hiringProfile: hiringProfileSchema.nullable().optional(),
});
