import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { bucketCountsByDay, bucketCountsByRecordType } from './stats.util';
import type { User } from '@repo/db';
import type { DashboardStatsResponse } from '@repo/contracts';

const NEW_PATIENTS_WINDOW_DAYS = 30;
const RECORDS_WINDOW_DAYS = 7;
const FOLLOW_UP_LOOKAHEAD_DAYS = 14;

function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

function daysAgo(days: number, from: Date): Date {
  return addDays(from, -days);
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getUnassignedPatientsCount(institutionId: string): Promise<number> {
    return this.prisma.patient.count({
      where: { institutionId, assignments: { none: { status: 'ACTIVE' } } },
    });
  }

  async getDashboardStats(actor: User): Promise<DashboardStatsResponse> {
    switch (actor.role) {
      case 'INSTITUTION_ADMIN':
        return this.getInstitutionAdminStats(actor);
      case 'STAFF':
        return this.getStaffStats(actor);
      case 'PROFESSIONAL':
        return this.getProfessionalStats(actor);
      default:
        // Guarded by @Roles at the controller — unreachable in practice.
        this.logger.warn(
          `Dashboard stats requested for unsupported role ${actor.role}`,
        );
        throw new BadRequestException(
          `No dashboard stats defined for role ${actor.role}`,
        );
    }
  }

  private async getInstitutionAdminStats(
    actor: User,
  ): Promise<DashboardStatsResponse> {
    const now = new Date();
    const institutionId = actor.institutionId;

    const [
      totalPatients,
      activeStaffCount,
      activeProfessionalCount,
      unassignedPatientsCount,
      recentRecords,
      recentPatients,
    ] = await Promise.all([
      this.prisma.patient.count({ where: { institutionId } }),
      this.prisma.user.count({
        where: { institutionId, role: 'STAFF', isActive: true },
      }),
      this.prisma.user.count({
        where: { institutionId, role: 'PROFESSIONAL', isActive: true },
      }),
      this.getUnassignedPatientsCount(institutionId),
      this.prisma.medicalRecord.findMany({
        where: {
          institutionId,
          isVoid: false,
          createdAt: { gte: daysAgo(RECORDS_WINDOW_DAYS, now) },
        },
        select: { recordType: true },
      }),
      this.prisma.patient.findMany({
        where: {
          institutionId,
          createdAt: { gte: daysAgo(NEW_PATIENTS_WINDOW_DAYS, now) },
        },
        select: { createdAt: true },
      }),
    ]);

    return {
      role: 'INSTITUTION_ADMIN',
      totalPatients,
      activeStaffCount,
      activeProfessionalCount,
      unassignedPatientsCount,
      recordsByTypeThisWeek: bucketCountsByRecordType(
        recentRecords.map((r) => r.recordType),
      ),
      newPatientsLast30Days: bucketCountsByDay(
        recentPatients.map((p) => p.createdAt),
        NEW_PATIENTS_WINDOW_DAYS,
        now,
      ),
    };
  }

  private async getStaffStats(actor: User): Promise<DashboardStatsResponse> {
    const now = new Date();
    const institutionId = actor.institutionId;

    const [unassignedPatientsCount, patientsRegisteredByMeThisWeek, recent] =
      await Promise.all([
        this.getUnassignedPatientsCount(institutionId),
        this.prisma.patient.count({
          where: {
            institutionId,
            user: { createdById: actor.id },
            createdAt: { gte: daysAgo(RECORDS_WINDOW_DAYS, now) },
          },
        }),
        this.prisma.patient.findMany({
          where: { institutionId, user: { createdById: actor.id } },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            createdAt: true,
            user: { select: { fullName: true } },
          },
        }),
      ]);

    return {
      role: 'STAFF',
      unassignedPatientsCount,
      patientsRegisteredByMeThisWeek,
      recentRegistrations: recent.map((p) => ({
        id: p.id,
        fullName: p.user.fullName,
        createdAt: p.createdAt,
      })),
    };
  }

  private async getProfessionalStats(
    actor: User,
  ): Promise<DashboardStatsResponse> {
    const now = new Date();
    // Includes overdue follow-ups (any date in the past) plus upcoming ones
    // within the lookahead window, so nothing due gets silently dropped.
    const followUpCutoff = addDays(now, FOLLOW_UP_LOOKAHEAD_DAYS);
    const assignedToMe = {
      assignments: { some: { professionalId: actor.id, status: 'ACTIVE' } },
    } as const;

    const [
      activeAssignedPatientsCount,
      recentRecords,
      followUpRecords,
      vaccinationRecords,
    ] = await Promise.all([
      this.prisma.assignment.count({
        where: { professionalId: actor.id, status: 'ACTIVE' },
      }),
      this.prisma.medicalRecord.findMany({
        where: {
          uploadedById: actor.id,
          isVoid: false,
          createdAt: { gte: daysAgo(RECORDS_WINDOW_DAYS, now) },
        },
        select: { recordType: true },
      }),
      this.prisma.medicalRecord.findMany({
        where: {
          recordType: 'CONSULTATION',
          isVoid: false,
          patient: assignedToMe,
          consultationDetail: { followUpDate: { lte: followUpCutoff } },
        },
        select: {
          id: true,
          patientId: true,
          patient: { select: { user: { select: { fullName: true } } } },
          consultationDetail: { select: { followUpDate: true } },
        },
      }),
      this.prisma.medicalRecord.findMany({
        where: {
          recordType: 'VACCINATION',
          isVoid: false,
          patient: assignedToMe,
          vaccinationDetail: { nextDoseDate: { lte: followUpCutoff } },
        },
        select: {
          id: true,
          patientId: true,
          patient: { select: { user: { select: { fullName: true } } } },
          vaccinationDetail: {
            select: { vaccineName: true, nextDoseDate: true },
          },
        },
      }),
    ]);

    const followUpsDue = followUpRecords
      .filter((r) => r.consultationDetail?.followUpDate)
      .map((r) => ({
        recordId: r.id,
        patientId: r.patientId,
        patientName: r.patient.user.fullName,
        followUpDate: r.consultationDetail!.followUpDate!,
      }))
      .sort(
        (a, b) =>
          new Date(a.followUpDate).getTime() -
          new Date(b.followUpDate).getTime(),
      );

    const vaccinationsDue = vaccinationRecords
      .filter((r) => r.vaccinationDetail?.nextDoseDate)
      .map((r) => ({
        recordId: r.id,
        patientId: r.patientId,
        patientName: r.patient.user.fullName,
        vaccineName: r.vaccinationDetail!.vaccineName,
        nextDoseDate: r.vaccinationDetail!.nextDoseDate!,
      }))
      .sort(
        (a, b) =>
          new Date(a.nextDoseDate).getTime() -
          new Date(b.nextDoseDate).getTime(),
      );

    return {
      role: 'PROFESSIONAL',
      activeAssignedPatientsCount,
      recordsByTypeThisWeek: bucketCountsByRecordType(
        recentRecords.map((r) => r.recordType),
      ),
      followUpsDue,
      vaccinationsDue,
    };
  }
}
