import { z } from 'zod';
import { recurrenceTypeSchema } from '../expenses/recurrence-type.schema';
import { productResponseSchema } from '../products/product.response';

export const saleResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  productId: z.uuid().nullable(),
  createdById: z.uuid(),
  description: z.string().nullable(),
  quantity: z.string(), // Decimal as string
  unitPrice: z.string(), // Decimal as string
  unitCost: z.string().nullable(),
  date: z.string(), // ISO date
  recurrence: recurrenceTypeSchema,
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Computed
  revenue: z.string().optional(), // quantity * unitPrice
  grossProfit: z.string().optional(), // (unitPrice - unitCost) * quantity
  product: productResponseSchema.nullable().optional(),
  createdBy: z
    .object({ id: z.uuid(), name: z.string(), email: z.string() })
    .optional(),
});

export type SaleResponse = z.infer<typeof saleResponseSchema>;
