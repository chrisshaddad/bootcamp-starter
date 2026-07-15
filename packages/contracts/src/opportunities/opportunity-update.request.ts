import { z } from 'zod';
import { opportunityStatusSchema } from './opportunity-status.schema';
import { opportunityTypeSchema } from './opportunity-type.schema';

export const opportunityUpdateRequestSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  type: opportunityTypeSchema.optional(),
  description: z.string().max(5000).optional(),
  departmentId: z.string().uuid().nullable().optional(),
  hiringManagerId: z.string().uuid().nullable().optional(),
  status: opportunityStatusSchema.optional(),
  deadline: z.coerce.date().nullable().optional(),
  requiredLevel: z.number().int().min(1).max(10).nullable().optional(),
  requiresManagerApproval: z.boolean().nullable().optional(),
  requiredSkills: z
    .array(
      z.object({
        skillId: z.string().uuid(),
        requiredLevel: z.number().int().min(1).max(5),
      }),
    )
    .optional(),
});

export type OpportunityUpdateRequest = z.infer<
  typeof opportunityUpdateRequestSchema
>;
