import { z } from 'zod';

export const TeacherOrganizationCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  teacherCount: z.number(),
});

export const TeacherOrganizationsResponseSchema = z.object({
  organizations: z.array(TeacherOrganizationCardSchema),
});

export type TeacherOrganizationCard = z.infer<
  typeof TeacherOrganizationCardSchema
>;

export type TeacherOrganizationsResponse = z.infer<
  typeof TeacherOrganizationsResponseSchema
>;
