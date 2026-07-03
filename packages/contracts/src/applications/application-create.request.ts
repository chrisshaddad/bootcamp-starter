import { z } from 'zod';

export const applicationCreateRequestSchema = z.object({
  opportunityId: z.uuid(),
  coverNote: z.string().trim().max(5000).optional(),
});
export type ApplicationCreateRequest = z.infer<
  typeof applicationCreateRequestSchema
>;
