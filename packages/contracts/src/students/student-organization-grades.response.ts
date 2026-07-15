import { z } from 'zod';

export const StudentGradeCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  sectionCount: z.number(),
  studentCount: z.number(),
});

export const StudentOrganizationGradesResponseSchema = z.object({
  organizationId: z.string(),
  grades: z.array(StudentGradeCardSchema),
});

export type StudentGradeCard = z.infer<typeof StudentGradeCardSchema>;

export type StudentOrganizationGradesResponse = z.infer<
  typeof StudentOrganizationGradesResponseSchema
>;
