import { z } from 'zod';
import { purchaseResponseSchema } from './purchase.response';

// Response for GET /purchases (staff view of a member's purchase history).
export const purchaseListResponseSchema = z.object({
  purchases: z.array(purchaseResponseSchema),
  total: z.number().int().nonnegative(),
});
export type PurchaseListResponse = z.infer<typeof purchaseListResponseSchema>;
