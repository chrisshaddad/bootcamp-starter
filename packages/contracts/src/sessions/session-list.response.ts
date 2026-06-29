import { z } from 'zod';
import { sessionResponseSchema } from './session.response';

export const sessionListResponseSchema = z.array(sessionResponseSchema);
export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;
