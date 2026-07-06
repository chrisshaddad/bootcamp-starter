import { z } from 'zod';

const skillGapEmployeeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  title: z.string().nullable(),
  level: z.number().nullable(),
});

const skillGapOpportunitySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  requiredLevel: z.number().nullable(),
});

const matchedSkillSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.string(),
  requiredLevel: z.number(),
  proficiencyLevel: z.number(),
});

const missingSkillSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  category: z.string(),
  requiredLevel: z.number(),
  proficiencyLevel: z.number().nullable(),
});

export const skillGapResponseSchema = z.object({
  employee: skillGapEmployeeSchema,
  opportunity: skillGapOpportunitySchema,
  fitScore: z.number(),
  matchedSkills: z.array(matchedSkillSchema),
  missingSkills: z.array(missingSkillSchema),
});
export type SkillGapResponse = z.infer<typeof skillGapResponseSchema>;
