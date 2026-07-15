import { z } from 'zod';
import { applicationResponseSchema } from './application.response';

export const applicationListResponseSchema = z.object({
  applications: z.array(applicationResponseSchema),
  total: z.number(),
});

export type ApplicationListResponse = z.infer<
  typeof applicationListResponseSchema
>;
