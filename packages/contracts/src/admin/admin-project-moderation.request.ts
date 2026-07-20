import { z } from 'zod';

export const adminProjectModerationSchema = z.strictObject({
  action: z.enum(['SUSPEND', 'RESTORE']),
  reason: z.string().trim().min(10).max(1000),
});

export type AdminProjectModeration = z.infer<
  typeof adminProjectModerationSchema
>;
