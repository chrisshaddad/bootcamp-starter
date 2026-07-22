import { z } from 'zod';
import { staffResponseSchema } from './staff.response';

// Response from GET /staff
export const staffListResponseSchema = z.object({
  staff: z.array(staffResponseSchema),
  total: z.number(),
});
export type StaffListResponse = z.infer<typeof staffListResponseSchema>;
