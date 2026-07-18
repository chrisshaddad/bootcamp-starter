import { z } from 'zod';

export const projectRoleSchema = z.enum(['OWNER', 'EDITOR', 'CONTRIBUTOR']);
export type ProjectRole = z.infer<typeof projectRoleSchema>;
