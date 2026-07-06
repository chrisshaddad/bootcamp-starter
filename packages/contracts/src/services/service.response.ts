import { z } from 'zod';

export const serviceResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  name: z.string(),
  description: z.string().nullable(),
  unitPrice: z.string(),
  unitCost: z.string().nullable(),
  sku: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ServiceResponse = z.infer<typeof serviceResponseSchema>;
