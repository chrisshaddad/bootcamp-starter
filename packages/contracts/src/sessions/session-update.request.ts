import { z } from 'zod';
import { sessionCreateRequestSchema } from './session-create.request';

/** Request schema for partially updating an existing gym session */
export const sessionUpdateRequestSchema = sessionCreateRequestSchema.partial();
export type SessionUpdateRequest = z.infer<typeof sessionUpdateRequestSchema>;
