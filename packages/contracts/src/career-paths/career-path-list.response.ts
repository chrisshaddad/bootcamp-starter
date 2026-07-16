import { z } from 'zod';
import { careerPathResponseSchema } from './career-path.response';

export const careerPathListResponseSchema = z.object({
  careerPaths: z.array(careerPathResponseSchema),
  total: z.number(),
});

export type CareerPathListResponse = z.infer<
  typeof careerPathListResponseSchema
>;
