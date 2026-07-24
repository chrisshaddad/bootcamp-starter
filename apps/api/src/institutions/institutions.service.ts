import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PLATFORM_INSTITUTION_ID, Prisma } from '@repo/db';
import type {
  InstitutionListQuery,
  InstitutionListResponse,
  InstitutionDetailResponse,
  InstitutionCreateRequest,
  InstitutionUpdateRequest,
} from '@repo/contracts';

@Injectable()
export class InstitutionsService {
  private readonly logger = new Logger(InstitutionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private readonly detailSelect = {
    id: true,
    name: true,
    type: true,
    status: true,
    address: true,
    phone: true,
    logoUrl: true,
    emailNotifications: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { users: true } },
  } as const;

  /**
   * Get all institutions with optional status filter
   */
  async findAll(query: InstitutionListQuery): Promise<InstitutionListResponse> {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;

    // The platform institution is internal bookkeeping (see PLATFORM_INSTITUTION_ID),
    // never a real tenant — exclude it from management views entirely.
    const where = {
      id: { not: PLATFORM_INSTITUTION_ID },
      ...(status ? { status } : {}),
    };

    const [institutions, total] = await Promise.all([
      this.prisma.institution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          address: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      }),
      this.prisma.institution.count({ where }),
    ]);

    return { institutions, total };
  }

  /**
   * Get a single institution by ID with full details
   */
  async findOne(id: string): Promise<InstitutionDetailResponse> {
    if (id === PLATFORM_INSTITUTION_ID) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id },
      select: this.detailSelect,
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }

    return institution;
  }

  /**
   * Get the caller's own institution (Institution Admin / Staff / Professional / Patient).
   * Unlike findOne, there is no platform-institution exclusion because the
   * caller's institutionId is always a real tenant.
   */
  async findMine(institutionId: string): Promise<InstitutionDetailResponse> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: this.detailSelect,
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    return institution;
  }

  /**
   * Update the caller's own institution profile (Institution Admin only).
   */
  async updateMine(
    institutionId: string,
    data: InstitutionUpdateRequest,
  ): Promise<InstitutionDetailResponse> {
    await this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.emailNotifications !== undefined
          ? { emailNotifications: data.emailNotifications }
          : {}),
      },
    });

    this.logger.log(`Institution ${institutionId} profile updated`);
    return this.findMine(institutionId);
  }

  /**
   * Create an institution together with its first admin user.
   * An institution with no admin has no one who can log in to manage it.
   */
  async create(
    data: InstitutionCreateRequest,
    createdById: string,
  ): Promise<InstitutionDetailResponse> {
    let institution: { id: string };

    try {
      institution = await this.prisma.$transaction(async (tx) => {
        const created = await tx.institution.create({
          data: {
            name: data.name,
            type: data.type,
            address: data.address ?? null,
          },
        });

        await tx.user.create({
          data: {
            ...data.admin,
            role: 'INSTITUTION_ADMIN',
            institutionId: created.id,
            createdById,
          },
        });

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('email')
      ) {
        this.logger.warn(
          `Institution creation rejected: admin email ${data.admin.email} already in use`,
        );
        throw new ConflictException(
          `A user with email ${data.admin.email} already exists`,
        );
      }
      throw error;
    }

    this.logger.log(`Institution ${institution.id} created`);
    return this.findOne(institution.id);
  }

  /**
   * Approve an institution (set status to ACTIVE)
   */
  async approve(id: string): Promise<InstitutionDetailResponse> {
    await this.ensureExists(id);

    await this.prisma.institution.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Institution ${id} approved`);
    return this.findOne(id);
  }

  /**
   * Reject an institution (set status to REJECTED)
   */
  async reject(id: string): Promise<InstitutionDetailResponse> {
    await this.ensureExists(id);

    await this.prisma.institution.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    this.logger.log(`Institution ${id} rejected`);
    return this.findOne(id);
  }

  /**
   * Suspend an institution (set status to SUSPENDED). Enforced at login/auth
   * time — every user of a non-ACTIVE institution is blocked from acting.
   */
  async suspend(id: string): Promise<InstitutionDetailResponse> {
    await this.ensureExists(id);

    await this.prisma.institution.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    this.logger.log(`Institution ${id} suspended`);
    return this.findOne(id);
  }

  /**
   * Reactivate a suspended or rejected institution (set status back to ACTIVE).
   */
  async reactivate(id: string): Promise<InstitutionDetailResponse> {
    await this.ensureExists(id);

    await this.prisma.institution.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Institution ${id} reactivated`);
    return this.findOne(id);
  }

  private async ensureExists(id: string): Promise<void> {
    if (id === PLATFORM_INSTITUTION_ID) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }

    const existing = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }
  }
}
