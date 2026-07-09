import { branchCreateRequestSchema } from './branch-create.request';
import { z } from 'zod';

// Body for editing a branch (PATCH /pharmacies/:id/branches/:branchId). Same
// fields as create, all optional so a partial edit is valid; the console's edit
// form always sends the full set.
export const branchUpdateRequestSchema = branchCreateRequestSchema.partial();
export type BranchUpdateRequest = z.infer<typeof branchUpdateRequestSchema>;
