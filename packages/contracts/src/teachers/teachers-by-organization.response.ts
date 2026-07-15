import { z } from 'zod';

export const TeacherListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  status: z.string(),
  createdAt: z.string(),
});

export const TeachersByOrganizationResponseSchema = z.object({
  organizationId: z.string(),
  teachers: z.array(TeacherListItemSchema),
});

export type TeacherListItem = z.infer<typeof TeacherListItemSchema>;

export type TeachersByOrganizationResponse = z.infer<
  typeof TeachersByOrganizationResponseSchema
>;
