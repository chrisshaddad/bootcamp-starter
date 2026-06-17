import { z } from 'zod';

export const productCreateRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal'),
  unitCost: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal')
    .optional(),
  sku: z.string().max(100).optional(),
  isActive: z.boolean().default(true),
});

export type ProductCreateRequest = z.infer<typeof productCreateRequestSchema>;
