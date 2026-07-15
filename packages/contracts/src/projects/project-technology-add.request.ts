import { z } from 'zod';
export const addProjectTechnologySchema = z.object({
  technologyId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
});
export type AddProjectTechnologyRequest = z.infer<
  typeof addProjectTechnologySchema
>;
