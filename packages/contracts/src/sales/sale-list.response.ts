import { z } from 'zod';
import { saleResponseSchema } from './sale.response';
import { paginatedMetaSchema } from '../common/pagination.schema';

export const saleListResponseSchema = z.object({
  sales: z.array(saleResponseSchema),
  meta: paginatedMetaSchema,
});

export type SaleListResponse = z.infer<typeof saleListResponseSchema>;
