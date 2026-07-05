import { z } from 'zod';

export const institutionTypeSchema = z.enum(['CLINIC', 'HOSPITAL', 'LAB']);
export type InstitutionType = z.infer<typeof institutionTypeSchema>;
