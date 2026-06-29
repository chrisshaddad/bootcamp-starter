import { z } from 'zod';
import { sessionCreateRequestSchema } from './session-create.request';

export const sessionUpdateRequestSchema = sessionCreateRequestSchema.partial();
export type SessionUpdateRequest = z.infer<typeof sessionUpdateRequestSchema>;
