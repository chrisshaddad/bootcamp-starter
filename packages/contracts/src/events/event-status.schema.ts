import { z } from 'zod';

export const eventStatusSchema = z.enum(['SCHEDULED', 'CANCELLED']);
export type EventStatus = z.infer<typeof eventStatusSchema>;
