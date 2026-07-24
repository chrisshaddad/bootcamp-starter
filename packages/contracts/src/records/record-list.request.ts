import { z } from 'zod';
import { recordTypeSchema } from './record-type.schema';
import { paginationQuerySchema } from '../common/pagination';

// Query params for GET /patients/:patientId/records. `recordType` may be
// repeated (?recordType=A&recordType=B) to filter by several types at once —
// Express/Nest's default query parser already arrays repeated keys, so this
// just normalizes a single occurrence into a one-element array too.
export const recordListQuerySchema = z.object({
  recordType: z
    .union([recordTypeSchema, z.array(recordTypeSchema)])
    .optional()
    .transform((v) =>
      v === undefined ? undefined : Array.isArray(v) ? v : [v],
    ),
  ...paginationQuerySchema.shape,
});
export type RecordListQuery = z.infer<typeof recordListQuerySchema>;
