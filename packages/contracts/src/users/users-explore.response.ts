import { z } from 'zod';
import { accountTypeSchema } from './user-role.schema';
import { developerProfileSchema, hiringProfileSchema } from './user.response';

// We omit sensitive details like the `email` for the public endpoint response
export const publicUserResponseSchema = z.object({
  id: z.string().uuid(),
  accountType: accountTypeSchema,
  developerProfile: developerProfileSchema.nullable().optional(),
  hiringProfile: hiringProfileSchema.nullable().optional(),
});

export const exploreUsersResponseSchema = z.object({
  data: z.array(publicUserResponseSchema),
  meta: z.object({
    totalItems: z.number(),
    currentPage: z.number(),
    totalPages: z.number(),
    hasNextPage: z.boolean(),
    hasPreviousPage: z.boolean(),
  }),
});

export type ExploreUsersResponse = z.infer<typeof exploreUsersResponseSchema>;
