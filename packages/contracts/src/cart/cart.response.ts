import { z } from 'zod';
import { dateSchema } from '../common';
import { cartItemResponseSchema } from './cart-item.response';

// Response shape for a patron's Cart (GET /portal/cart and every mutation)
export const cartResponseSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  memberId: z.uuid(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  items: z.array(cartItemResponseSchema),
});
export type CartResponse = z.infer<typeof cartResponseSchema>;
