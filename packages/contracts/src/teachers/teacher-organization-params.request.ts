import { z } from 'zod';

export const TeacherOrganizationParamsSchema = z.object({
  organizationId: z.string().uuid(),
});

export type TeacherOrganizationParams = z.infer<
  typeof TeacherOrganizationParamsSchema
>;
