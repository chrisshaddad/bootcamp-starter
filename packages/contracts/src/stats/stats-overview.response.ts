import { z } from 'zod';
import { dateSchema } from '../common';

const topEventSchema = z.object({
  eventId: z.uuid(),
  eventName: z.string(),
  startsAt: dateSchema,
  registeredCount: z.number(),
});

const topPresenterSchema = z.object({
  memberId: z.uuid(),
  username: z.string(),
  eventsHosted: z.number(),
});

const topAttendeeSchema = z.object({
  userId: z.uuid(),
  name: z.string().nullable(),
  email: z.email(),
  attendedCount: z.number(),
});

export const statsOverviewResponseSchema = z.object({
  memberCount: z.number(),
  totalEvents: z.number(),
  upcomingEvents: z.number(),
  pastEvents: z.number(),
  totalRegistrations: z.number(),
  attendanceRate: z.number().nullable(),
  noShowRate: z.number().nullable(),
  avgRegistrationsPerPastEvent: z.number().nullable(),
  topEventsByRegistrations: z.array(topEventSchema),
  topPresentersByEvents: z.array(topPresenterSchema),
  topAttendees: z.array(topAttendeeSchema),
});
export type StatsOverviewResponse = z.infer<typeof statsOverviewResponseSchema>;
