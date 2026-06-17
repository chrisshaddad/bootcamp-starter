import { z } from 'zod';
import { paginationQuerySchema } from '../common/pagination.schema';

export const saleQuerySchema = paginationQuerySchema.extend({
  productId: z.uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
});

export type SaleQuery = z.infer<typeof saleQuerySchema>;
