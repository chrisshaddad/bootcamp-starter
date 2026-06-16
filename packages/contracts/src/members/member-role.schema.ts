import { z } from 'zod';

export const memberRoleSchema = z.enum(['ADMIN', 'MEMBER']);
export type MemberRole = z.infer<typeof memberRoleSchema>;
