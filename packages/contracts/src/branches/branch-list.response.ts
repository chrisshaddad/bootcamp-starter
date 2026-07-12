import { z } from 'zod';
import { branchResponseSchema } from './branch.response';

// Response from GET /branches — every branch in the caller's pharmacy, each
// carrying its live staff count so the console can warn before a delete.
export const branchListResponseSchema = z.object({
  branches: z.array(branchResponseSchema),
  total: z.number(),
});
export type BranchListResponse = z.infer<typeof branchListResponseSchema>;
