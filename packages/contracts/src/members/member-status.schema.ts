import { z } from 'zod';

export const memberStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);
export type MemberStatus = z.infer<typeof memberStatusSchema>;
