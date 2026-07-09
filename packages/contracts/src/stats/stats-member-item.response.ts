import { z } from 'zod';
import { memberRoleSchema } from '../members/member-role.schema';

export const statsMemberItemSchema = z.object({
  memberId: z.uuid(),
  username: z.string(),
  role: memberRoleSchema,
  eventsHosted: z.number(),
  upcomingHosted: z.number(),
  pastHosted: z.number(),
  totalRegistrationsAcrossEvents: z.number(),
  avgRegistrationsPerEvent: z.number(),
  avgAttendanceRate: z.number().nullable(),
});
export type StatsMemberItem = z.infer<typeof statsMemberItemSchema>;
