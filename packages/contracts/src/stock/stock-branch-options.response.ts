import { z } from 'zod';

// Branches the caller may view/manage stock for, for the branch picker. A
// STOCK_MANAGER gets their single branch; a PHARMACY_ADMIN gets every branch in
// their pharmacy. Resolved server-side from the session user.
export const stockBranchOptionsResponseSchema = z.array(
  z.object({
    id: z.uuid(),
    name: z.string(),
  }),
);
export type StockBranchOptionsResponse = z.infer<
  typeof stockBranchOptionsResponseSchema
>;
