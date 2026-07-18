import { z } from 'zod';

export const projectScopeSchema = z.enum(['ALL', 'OWNED', 'COLLABORATIONS']);
export type ProjectScope = z.infer<typeof projectScopeSchema>;
