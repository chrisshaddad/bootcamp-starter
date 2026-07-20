import { z } from 'zod';
import { dateSchema } from '../common';

export const recordTypeCountSchema = z.object({
  recordType: z.enum([
    'LAB_RESULT',
    'CONSULTATION',
    'PRESCRIPTION',
    'SCAN',
    'VACCINATION',
  ]),
  count: z.number().int().nonnegative(),
});
export type RecordTypeCount = z.infer<typeof recordTypeCountSchema>;

export const dailyCountSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  count: z.number().int().nonnegative(),
});
export type DailyCount = z.infer<typeof dailyCountSchema>;

export const recentPatientSchema = z.object({
  id: z.uuid(),
  fullName: z.string(),
  createdAt: dateSchema,
});
export type RecentPatient = z.infer<typeof recentPatientSchema>;

export const upcomingFollowUpSchema = z.object({
  recordId: z.uuid(),
  patientId: z.uuid(),
  patientName: z.string(),
  followUpDate: dateSchema,
});
export type UpcomingFollowUp = z.infer<typeof upcomingFollowUpSchema>;

export const upcomingVaccinationSchema = z.object({
  recordId: z.uuid(),
  patientId: z.uuid(),
  patientName: z.string(),
  vaccineName: z.string(),
  nextDoseDate: dateSchema,
});
export type UpcomingVaccination = z.infer<typeof upcomingVaccinationSchema>;

export const institutionAdminStatsSchema = z.object({
  role: z.literal('INSTITUTION_ADMIN'),
  totalPatients: z.number().int().nonnegative(),
  activeStaffCount: z.number().int().nonnegative(),
  activeProfessionalCount: z.number().int().nonnegative(),
  unassignedPatientsCount: z.number().int().nonnegative(),
  recordsByTypeThisWeek: z.array(recordTypeCountSchema),
  newPatientsLast30Days: z.array(dailyCountSchema),
});
export type InstitutionAdminStats = z.infer<typeof institutionAdminStatsSchema>;

export const staffStatsSchema = z.object({
  role: z.literal('STAFF'),
  unassignedPatientsCount: z.number().int().nonnegative(),
  patientsRegisteredByMeThisWeek: z.number().int().nonnegative(),
  recentRegistrations: z.array(recentPatientSchema),
});
export type StaffStats = z.infer<typeof staffStatsSchema>;

export const professionalStatsSchema = z.object({
  role: z.literal('PROFESSIONAL'),
  activeAssignedPatientsCount: z.number().int().nonnegative(),
  recordsByTypeThisWeek: z.array(recordTypeCountSchema),
  followUpsDue: z.array(upcomingFollowUpSchema),
  vaccinationsDue: z.array(upcomingVaccinationSchema),
});
export type ProfessionalStats = z.infer<typeof professionalStatsSchema>;

// Response from GET /stats/dashboard — shape is discriminated by the caller's role.
export const dashboardStatsResponseSchema = z.discriminatedUnion('role', [
  institutionAdminStatsSchema,
  staffStatsSchema,
  professionalStatsSchema,
]);
export type DashboardStatsResponse = z.infer<
  typeof dashboardStatsResponseSchema
>;
