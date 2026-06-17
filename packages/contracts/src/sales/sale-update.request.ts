import { z } from 'zod';
import { saleCreateRequestSchema } from './sale-create.request';

export const saleUpdateRequestSchema = saleCreateRequestSchema.partial();

export type SaleUpdateRequest = z.infer<typeof saleUpdateRequestSchema>;
