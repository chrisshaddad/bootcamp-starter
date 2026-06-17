import { z } from 'zod';
import { productResponseSchema } from './product.response';
import { paginatedMetaSchema } from '../common/pagination.schema';

export const productListResponseSchema = z.object({
  products: z.array(productResponseSchema),
  meta: paginatedMetaSchema,
});

export type ProductListResponse = z.infer<typeof productListResponseSchema>;
