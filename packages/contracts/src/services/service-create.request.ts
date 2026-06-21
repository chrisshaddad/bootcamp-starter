import { z } from 'zod';

const optionalEmptyString = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([z.literal(''), schema]).optional();

export const serviceCreateRequestSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: optionalEmptyString(z.string().trim().max(2000)),
  unitPrice: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal'),
  unitCost: optionalEmptyString(
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a valid decimal'),
  ),
  sku: optionalEmptyString(z.string().trim().max(100)),
  isActive: z.boolean().default(true),
});

export type ServiceCreateRequest = z.infer<typeof serviceCreateRequestSchema>;
