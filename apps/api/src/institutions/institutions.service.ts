import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { InstitutionStatus } from '@repo/db';
import type {
  InstitutionListResponse,
  InstitutionDetailResponse,
  InstitutionCreateRequest,
} from '@repo/contracts';

@Injectable()
export class InstitutionsService {
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
  async findAll(options: {
    status?: InstitutionStatus;
    page?: number;
    limit?: number;
  }): Promise<InstitutionListResponse> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

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
   * Create an institution together with its first admin user.
   * An institution with no admin has no one who can log in to manage it.
   */
  async create(
    data: InstitutionCreateRequest,
    createdById: string,
  ): Promise<InstitutionDetailResponse> {
    const institution = await this.prisma.$transaction(async (tx) => {
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

    return this.findOne(id);
  }

  private async ensureExists(id: string): Promise<void> {
    const existing = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }
  }
}
