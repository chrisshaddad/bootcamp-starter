import { z } from 'zod';

export const StudentListItemSchema = z.object({
  id: z.string(),
  studentCode: z.string(),
  name: z.string(),
  email: z.string(),
  sectionName: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  status: z.string(),
});

export const StudentsByGradeResponseSchema = z.object({
  organizationId: z.string(),
  gradeId: z.string(),
  students: z.array(StudentListItemSchema),
});

export type StudentListItem = z.infer<typeof StudentListItemSchema>;

export type StudentsByGradeResponse = z.infer<
  typeof StudentsByGradeResponseSchema
>;
