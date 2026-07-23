import { z } from 'zod';
import { dateSchema } from '../common';
import { applicationStatusSchema } from './application-status.schema';

const applicationOpportunitySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  type: z.string(),
});

const applicationUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

export const applicationResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  opportunityId: z.uuid(),
  status: applicationStatusSchema,
  fitScore: z.number().nullable(),
  coverNote: z.string().nullable(),
  managerApproved: z.boolean().nullable(),
  reviewerNotes: z.string().nullable(),
  user: applicationUserSchema,
  opportunity: applicationOpportunitySchema,
  createdAt: dateSchema,
  updatedAt: dateSchema,
});
export type ApplicationResponse = z.infer<typeof applicationResponseSchema>;
