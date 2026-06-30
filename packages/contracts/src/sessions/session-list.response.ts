import { z } from 'zod';
import { sessionResponseSchema } from './session.response';

/** Array of session responses returned by the list endpoint */
export const sessionListResponseSchema = z.array(sessionResponseSchema);
export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;
