import { z } from 'zod';
import { institutionDetailResponseSchema } from './institution-detail.response';

// Response from PATCH /institutions/:id/approve or /reject
export const institutionActionResponseSchema = z.object({
  message: z.string(),
  institution: institutionDetailResponseSchema,
});
export type InstitutionActionResponse = z.infer<
  typeof institutionActionResponseSchema
>;
