import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { isProfessionalAssigned } from '../common/access/patient-access';
import { Prisma, type User } from '@repo/db';
import type {
  PatientCreateRequest,
  PatientAdminUpdateRequest,
  PatientClinicalUpdateRequest,
  PatientListQuery,
  PatientListResponse,
  PatientDetailResponse,
} from '@repo/contracts';

// Minimal shape needed for access checks before building the full detail.
type PatientScope = { id: string; institutionId: string; userId: string };

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(
    data: PatientCreateRequest,
    actor: User,
  ): Promise<PatientDetailResponse> {
    let patientId: string;

    try {
      patientId = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            fullName: data.fullName,
            email: data.email.toLowerCase(),
            phone: data.phone,
            role: 'PATIENT',
            institutionId: actor.institutionId,
            createdById: actor.id,
          },
        });

        const patient = await tx.patient.create({
          data: {
            userId: user.id,
            institutionId: actor.institutionId,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            gender: data.gender ?? null,
            nationalId: data.nationalId ?? null,
            address: data.address ?? null,
            emergencyContactName: data.emergencyContactName ?? null,
            emergencyContactPhone: data.emergencyContactPhone ?? null,
            emergencyContactRelationship:
              data.emergencyContactRelationship ?? null,
          },
        });

        return patient.id;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('email')
      ) {
        this.logger.warn('Patient creation rejected: email already in use');
        throw new ConflictException(
          `A user with email ${data.email} already exists`,
        );
      }
      throw error;
    }

    // Best-effort: the patient is already persisted, so a failure to queue the
    // invitation email must not turn a successful creation into an API error.
    try {
      await this.sendInvitationFor(patientId, actor);
    } catch (error) {
      this.logger.error(
        `Patient ${patientId} created but invitation failed to send`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(`Patient ${patientId} created by ${actor.id}`);
    return this.buildDetail(patientId);
  }

  async findAll(
    query: PatientListQuery,
    actor: User,
  ): Promise<PatientListResponse> {
    const { search, unassigned, page, limit } = query;
    const skip = (page - 1) * limit;

    // Both are `assignments` relation filters, so they're combined via `AND`
    // rather than spread onto the same key (which would let the second
    // silently overwrite the first).
    const assignmentFilters: Prisma.PatientWhereInput[] = [];
    if (actor.role === 'PROFESSIONAL') {
      // Professionals only see patients they are actively assigned to.
      assignmentFilters.push({
        assignments: { some: { professionalId: actor.id, status: 'ACTIVE' } },
      });
    }
    if (unassigned) {
      assignmentFilters.push({ assignments: { none: { status: 'ACTIVE' } } });
    }

    const where: Prisma.PatientWhereInput = {
      institutionId: actor.institutionId,
      ...(assignmentFilters.length ? { AND: assignmentFilters } : {}),
      ...(search
        ? {
            OR: [
              {
                user: { fullName: { contains: search, mode: 'insensitive' } },
              },
              { user: { email: { contains: search, mode: 'insensitive' } } },
              { nationalId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              isActive: true,
            },
          },
        },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      patients: patients.map((p) => ({
        id: p.id,
        userId: p.userId,
        fullName: p.user.fullName,
        email: p.user.email,
        phone: p.user.phone,
        gender: p.gender,
        dateOfBirth: p.dateOfBirth,
        nationalId: p.nationalId,
        isActive: p.user.isActive,
        createdAt: p.createdAt,
      })),
      total,
    };
  }

  async findMe(actor: User): Promise<PatientDetailResponse> {
    const patient = await this.prisma.patient.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('No patient profile for this account');
    }

    return this.buildDetail(patient.id);
  }

  async findOneForUser(
    id: string,
    actor: User,
  ): Promise<PatientDetailResponse> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: { id: true, institutionId: true, userId: true },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    await this.assertCanView(patient, actor);
    return this.buildDetail(id);
  }

  async updateAdmin(
    id: string,
    data: PatientAdminUpdateRequest,
    actor: User,
  ): Promise<PatientDetailResponse> {
    const patient = await this.getInstitutionPatient(id, actor);

    await this.prisma.$transaction(async (tx) => {
      if (data.fullName !== undefined || data.phone !== undefined) {
        await tx.user.update({
          where: { id: patient.userId },
          data: {
            ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
          },
        });
      }

      await tx.patient.update({
        where: { id },
        data: {
          ...(data.dateOfBirth !== undefined
            ? {
                dateOfBirth: data.dateOfBirth
                  ? new Date(data.dateOfBirth)
                  : null,
              }
            : {}),
          ...(data.gender !== undefined ? { gender: data.gender } : {}),
          ...(data.nationalId !== undefined
            ? { nationalId: data.nationalId }
            : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.emergencyContactName !== undefined
            ? { emergencyContactName: data.emergencyContactName }
            : {}),
          ...(data.emergencyContactPhone !== undefined
            ? { emergencyContactPhone: data.emergencyContactPhone }
            : {}),
          ...(data.emergencyContactRelationship !== undefined
            ? {
                emergencyContactRelationship: data.emergencyContactRelationship,
              }
            : {}),
        },
      });
    });

    return this.buildDetail(id);
  }

  async updateClinical(
    id: string,
    data: PatientClinicalUpdateRequest,
    actor: User,
  ): Promise<PatientDetailResponse> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: { id: true, institutionId: true, userId: true },
    });

    if (!patient || patient.institutionId !== actor.institutionId) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    // Institution Admin may edit any patient's clinical summary; a Professional
    // only if actively assigned.
    if (
      actor.role === 'PROFESSIONAL' &&
      !(await isProfessionalAssigned(this.prisma, actor.id, id))
    ) {
      throw new ForbiddenException('You are not assigned to this patient');
    }

    await this.prisma.patient.update({
      where: { id },
      data: {
        ...(data.bloodType !== undefined ? { bloodType: data.bloodType } : {}),
        ...(data.allergies !== undefined ? { allergies: data.allergies } : {}),
        ...(data.chronicConditions !== undefined
          ? { chronicConditions: data.chronicConditions }
          : {}),
        ...(data.clinicalNotes !== undefined
          ? { clinicalNotes: data.clinicalNotes }
          : {}),
      },
    });

    return this.buildDetail(id);
  }

  async setStatus(
    id: string,
    isActive: boolean,
    actor: User,
  ): Promise<PatientDetailResponse> {
    const patient = await this.getInstitutionPatient(id, actor);

    await this.prisma.user.update({
      where: { id: patient.userId },
      data: { isActive },
    });
    this.logger.log(
      `Patient ${id} ${isActive ? 'reactivated' : 'deactivated'} by ${actor.id}`,
    );

    return this.buildDetail(id);
  }

  // ---- helpers ---------------------------------------------------------

  private async assertCanView(
    patient: PatientScope,
    actor: User,
  ): Promise<void> {
    switch (actor.role) {
      case 'INSTITUTION_ADMIN':
      case 'STAFF':
        if (patient.institutionId !== actor.institutionId) {
          throw new NotFoundException(
            `Patient with ID ${patient.id} not found`,
          );
        }
        return;
      case 'PROFESSIONAL':
        // Cross-institution patients must look non-existent, not forbidden.
        if (patient.institutionId !== actor.institutionId) {
          throw new NotFoundException(
            `Patient with ID ${patient.id} not found`,
          );
        }
        if (
          !(await isProfessionalAssigned(this.prisma, actor.id, patient.id))
        ) {
          throw new ForbiddenException('You are not assigned to this patient');
        }
        return;
      case 'PATIENT':
        if (patient.userId !== actor.id) {
          throw new ForbiddenException('You can only view your own record');
        }
        return;
      default:
        throw new ForbiddenException('Access denied');
    }
  }

  private async getInstitutionPatient(
    id: string,
    actor: User,
  ): Promise<PatientScope> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: { id: true, institutionId: true, userId: true },
    });

    if (!patient || patient.institutionId !== actor.institutionId) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient;
  }

  private async buildDetail(id: string): Promise<PatientDetailResponse> {
    const patient = await this.prisma.patient.findUniqueOrThrow({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            isActive: true,
            isConfirmed: true,
          },
        },
        assignments: {
          where: { status: 'ACTIVE' },
          include: {
            professional: {
              select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                professionalProfile: { select: { specialty: true, bio: true } },
              },
            },
          },
        },
      },
    });

    return {
      id: patient.id,
      userId: patient.userId,
      institutionId: patient.institutionId,
      fullName: patient.user.fullName,
      email: patient.user.email,
      phone: patient.user.phone,
      isActive: patient.user.isActive,
      isConfirmed: patient.user.isConfirmed,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      nationalId: patient.nationalId,
      address: patient.address,
      emergencyContactName: patient.emergencyContactName,
      emergencyContactPhone: patient.emergencyContactPhone,
      emergencyContactRelationship: patient.emergencyContactRelationship,
      bloodType: patient.bloodType,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
      clinicalNotes: patient.clinicalNotes,
      careTeam: patient.assignments.map((a) => ({
        assignmentId: a.id,
        professionalId: a.professionalId,
        fullName: a.professional.fullName,
        specialty: a.professional.professionalProfile?.specialty ?? null,
        bio: a.professional.professionalProfile?.bio ?? null,
        phone: a.professional.phone,
        email: a.professional.email,
      })),
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }

  private async sendInvitationFor(
    patientId: string,
    actor: User,
  ): Promise<void> {
    const [patient, institution] = await Promise.all([
      this.prisma.patient.findUniqueOrThrow({
        where: { id: patientId },
        select: { user: { select: { id: true, email: true } } },
      }),
      this.prisma.institution.findUniqueOrThrow({
        where: { id: actor.institutionId },
        select: { name: true },
      }),
    ]);

    await this.authService.sendInvitation(
      patient.user,
      actor.fullName,
      institution.name,
    );
  }
}
