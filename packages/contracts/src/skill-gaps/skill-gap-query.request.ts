import { z } from 'zod';

export const skillGapQueryRequestSchema = z.object({
  employeeId: z.uuid(),
  opportunityId: z.uuid(),
});
export type SkillGapQueryRequest = z.infer<typeof skillGapQueryRequestSchema>;
