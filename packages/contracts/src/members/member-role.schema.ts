import { z } from 'zod';

export const memberRoleSchema = z.enum(['ADMIN', 'PRESENTER']);
export type MemberRole = z.infer<typeof memberRoleSchema>;
