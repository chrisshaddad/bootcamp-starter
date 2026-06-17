import { z } from 'zod';
import { productCreateRequestSchema } from './product-create.request';

export const productUpdateRequestSchema = productCreateRequestSchema.partial();

export type ProductUpdateRequest = z.infer<typeof productUpdateRequestSchema>;
