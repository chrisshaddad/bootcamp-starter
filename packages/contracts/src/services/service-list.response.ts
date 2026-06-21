import { z } from 'zod';
import { serviceResponseSchema } from './service.response';
import { paginatedMetaSchema } from '../common/pagination.schema';

export const serviceListResponseSchema = z.object({
  services: z.array(serviceResponseSchema),
  meta: paginatedMetaSchema,
});

export type ServiceListResponse = z.infer<typeof serviceListResponseSchema>;
