import { z } from 'zod';

export const adminAuditTargetTypeSchema = z.enum(['USER', 'PROJECT']);

export type AdminAuditTargetType = z.infer<typeof adminAuditTargetTypeSchema>;
