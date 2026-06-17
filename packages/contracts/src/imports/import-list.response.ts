import { z } from 'zod';
import { importResponseSchema } from './import.response';
import { paginatedMetaSchema } from '../common/pagination.schema';

export const importListResponseSchema = z.object({
  imports: z.array(importResponseSchema),
  meta: paginatedMetaSchema,
});

export type ImportListResponse = z.infer<typeof importListResponseSchema>;
