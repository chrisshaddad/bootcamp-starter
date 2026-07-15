import { z } from 'zod';
import { opportunityStatusSchema } from './opportunity-status.schema';
import { opportunityTypeSchema } from './opportunity-type.schema';

export const opportunityCreateRequestSchema = z.object({
  title: z.string().min(3).max(200),
  type: opportunityTypeSchema,
  description: z.string().max(5000).optional(),
  departmentId: z.string().uuid().optional(),
  hiringManagerId: z.string().uuid().optional(),
  status: opportunityStatusSchema.optional(),
  deadline: z.coerce.date().optional(),
  requiredLevel: z.number().int().min(1).max(10).optional(),
  requiresManagerApproval: z.boolean().optional(),
  requiredSkills: z
    .array(
      z.object({
        skillId: z.string().uuid(),
        requiredLevel: z.number().int().min(1).max(5),
      }),
    )
    .optional()
    .default([]),
});

export type OpportunityCreateRequest = z.infer<
  typeof opportunityCreateRequestSchema
>;
