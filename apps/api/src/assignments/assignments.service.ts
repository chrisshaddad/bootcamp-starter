import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { isProfessionalAssigned } from '../common/access/patient-access';
import { Prisma, type User } from '@repo/db';
import type {
  AssignmentCreateRequest,
  AssignmentResponse,
  AssignmentListResponse,
} from '@repo/contracts';

const withProfessional = {
  professional: {
    select: {
      fullName: true,
      phone: true,
      professionalProfile: { select: { specialty: true } },
    },
  },
} as const;

type AssignmentWithProfessional = Prisma.AssignmentGetPayload<{
  include: typeof withProfessional;
}>;

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private toResponse(a: AssignmentWithProfessional): AssignmentResponse {
    return {
      id: a.id,
      patientId: a.patientId,
      professionalId: a.professionalId,
      status: a.status,
      fullName: a.professional.fullName,
      specialty: a.professional.professionalProfile?.specialty ?? null,
      phone: a.professional.phone,
      createdAt: a.createdAt,
    };
  }

  async create(
    data: AssignmentCreateRequest,
    actor: User,
  ): Promise<AssignmentResponse> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { id: true, institutionId: true },
    });

    if (!patient || patient.institutionId !== actor.institutionId) {
      throw new NotFoundException(`Patient with ID ${data.patientId} not found`);
    }

    const professional = await this.prisma.user.findUnique({
      where: { id: data.professionalId },
      select: { id: true, role: true, institutionId: true, isActive: true },
    });

    if (
      !professional ||
      professional.institutionId !== actor.institutionId ||
      professional.role !== 'PROFESSIONAL'
    ) {
      throw new BadRequestException('Invalid professional for this institution');
    }

    if (!professional.isActive) {
      throw new BadRequestException('Cannot assign a deactivated professional');
    }

    let assignment: AssignmentWithProfessional;
    try {
      assignment = await this.prisma.assignment.create({
        data: {
          patientId: data.patientId,
          professionalId: data.professionalId,
          assignedById: actor.id,
          institutionId: actor.institutionId,
        },
        include: withProfessional,
      });
    } catch (error) {
      // The `assignment_active_unique` partial index blocks a duplicate ACTIVE
      // assignment for the same (patient, professional) pair.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This professional is already assigned to the patient',
        );
      }
      throw error;
    }

    await this.notifications.create({
      recipientId: data.professionalId,
      senderId: actor.id,
      title: 'New patient assigned',
      body: `${actor.fullName} added you to a patient's care team.`,
      linkedEntityType: 'ASSIGNMENT',
      linkedEntityId: assignment.id,
    });

    this.logger.log(
      `Assignment ${assignment.id} created (patient ${data.patientId} → professional ${data.professionalId})`,
    );
    return this.toResponse(assignment);
  }

  async findForPatient(
    patientId: string,
    actor: User,
  ): Promise<AssignmentListResponse> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, institutionId: true },
    });

    if (!patient || patient.institutionId !== actor.institutionId) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    if (
      actor.role === 'PROFESSIONAL' &&
      !(await isProfessionalAssigned(this.prisma, actor.id, patientId))
    ) {
      throw new ForbiddenException('You are not assigned to this patient');
    }

    const assignments = await this.prisma.assignment.findMany({
      where: { patientId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: withProfessional,
    });

    return { assignments: assignments.map((a) => this.toResponse(a)) };
  }

  async deactivate(id: string, actor: User): Promise<AssignmentResponse> {
    const existing = await this.prisma.assignment.findUnique({
      where: { id },
      select: { id: true, institutionId: true },
    });

    if (!existing || existing.institutionId !== actor.institutionId) {
      throw new NotFoundException(`Assignment with ID ${id} not found`);
    }

    const updated = await this.prisma.assignment.update({
      where: { id },
      data: { status: 'INACTIVE' },
      include: withProfessional,
    });

    this.logger.log(`Assignment ${id} deactivated`);
    return this.toResponse(updated);
  }
}
