import { z } from 'zod';

export const groupCreateQuerySchema = z.object({
  organizationId: z.uuid().optional(),
});
export type GroupCreateQuery = z.infer<typeof groupCreateQuerySchema>;
