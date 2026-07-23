import { z } from 'zod';
import { purchaseResponseSchema } from './purchase.response';

// Response from POST /portal/cart/checkout
export const checkoutResponseSchema = z.object({
  purchases: z.array(purchaseResponseSchema),
  total: z.string(),
});
export type CheckoutResponse = z.infer<typeof checkoutResponseSchema>;
