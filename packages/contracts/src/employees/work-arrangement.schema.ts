import { z } from 'zod';

export const workArrangementSchema = z.enum(['REMOTE', 'HYBRID', 'ONSITE']);
export type WorkArrangement = z.infer<typeof workArrangementSchema>;
