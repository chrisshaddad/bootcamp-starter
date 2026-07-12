import { z } from 'zod';

export const StudentOrganizationCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  studentCount: z.number(),
});

export const StudentOrganizationsResponseSchema = z.object({
  organizations: z.array(StudentOrganizationCardSchema),
});

export type StudentOrganizationCard = z.infer<
  typeof StudentOrganizationCardSchema
>;

export type StudentOrganizationsResponse = z.infer<
  typeof StudentOrganizationsResponseSchema
>;
