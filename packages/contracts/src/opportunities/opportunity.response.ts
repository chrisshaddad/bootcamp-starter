import { z } from 'zod';
import { dateSchema } from '../common';
import { opportunityStatusSchema } from './opportunity-status.schema';

const opportunityDepartmentSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const opportunityHiringManagerSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
});

const opportunitySkillSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.string(),
  requiredLevel: z.number(),
});

export const opportunityResponseSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  type: z.string(),
  description: z.string().nullable(),
  status: opportunityStatusSchema,
  deadline: dateSchema.nullable(),
  requiredLevel: z.number().nullable(),
  organizationId: z.uuid(),
  requiresManagerApproval: z.boolean().nullable(),
  department: opportunityDepartmentSchema.nullable(),
  hiringManager: opportunityHiringManagerSchema.nullable(),
  requiredSkills: z.array(opportunitySkillSchema),
  applicationCount: z.number(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type OpportunityResponse = z.infer<typeof opportunityResponseSchema>;
