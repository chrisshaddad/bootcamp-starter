import { z } from 'zod';

export const uuidSchema = z.uuid('Invalid ID');
export type Uuid = z.infer<typeof uuidSchema>;
