import { z } from 'zod';

export const employeeSkillsUpdateRequestSchema = z.object({
  skills: z.array(
    z.object({
      skillId: z.string().uuid(),
      proficiencyLevel: z.number().int().min(1).max(5),
    }),
  ),
});

export type EmployeeSkillsUpdateRequest = z.infer<typeof employeeSkillsUpdateRequestSchema>;
