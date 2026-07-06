import { z } from 'zod';
import { serviceCreateRequestSchema } from './service-create.request';

export const serviceUpdateRequestSchema = serviceCreateRequestSchema.partial();

export type ServiceUpdateRequest = z.infer<typeof serviceUpdateRequestSchema>;
