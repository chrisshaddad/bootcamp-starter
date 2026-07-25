import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { bucketByDay } from '../dashboard/dashboard.service';
import type { OrganizationStatus, Prisma } from '@repo/db';
import type {
  CreateOrganizationRequest,
  OrganizationUpdateRequest,
  OrganizationListResponse,
  OrganizationDetailResponse,
  OrganizationRegisterResponse,
  OrganizationDirectoryResponse,
  OrganizationSummaryResponse,
} from '@repo/contracts';

const TREND_DAYS = 14;

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * Public library self-registration.
   *
   * Creates a PENDING Organization plus its owning ORG_ADMIN user (in one
   * transaction) and emails that admin a magic link to sign in. The library
   * stays PENDING until a SUPER_ADMIN approves it.
   */
  async register(
    dto: CreateOrganizationRequest,
  ): Promise<OrganizationRegisterResponse> {
    const { name, slug, adminName, adminEmail } = dto;

    // A slug is the tenant's public URL identity — it must be globally unique.
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (existingOrg) {
      throw new ConflictException(
        `The slug "${slug}" is already taken. Please choose another.`,
      );
    }

    // Email is one-login-per-person (globally unique), so we can't spin up a
    // fresh ORG_ADMIN for an address that already has an account.
    const existingUser = await this.prisma.user.findUnique({
      where: { email: adminEmail },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException(
        `An account with the email "${adminEmail}" already exists.`,
      );
    }

    const organization = await this.prisma.$transaction(async (tx) => {
      // Create the admin first so the organization can reference it as creator
      // (Organization.createdById is required and @unique).
      const admin = await tx.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          role: 'ORG_ADMIN',
        },
      });

      const org = await tx.organization.create({
        data: {
          name,
          slug,
          status: 'PENDING',
          createdById: admin.id,
        },
        select: { id: true, name: true, slug: true, status: true },
      });

      // Pin the admin to their new library (staff carry organizationId).
      await tx.user.update({
        where: { id: admin.id },
        data: { organizationId: org.id },
      });

      return org;
    });

    // Reuse the shared magic-link flow (token + Mailpit job); it also confirms
    // the email on first verify. Runs after the txn so the user row exists.
    await this.authService.requestMagicLink(adminEmail);

    return { ...organization, adminEmail };
  }

  /**
   * Public library directory - ACTIVE organizations only, lightweight shape.
   * Deliberately separate from findAll() (SUPER_ADMIN-only, admin-oriented
   * fields/counts, requires auth).
   */
  async directory(options: {
    page?: number;
    limit?: number;
  }): Promise<OrganizationDirectoryResponse> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where = { status: 'ACTIVE' as const };

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          website: true,
          logoUrl: true,
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { organizations, total };
  }

  /**
   * SUPER_ADMIN platform-wide at-a-glance summary: library approvals queue,
   * total user base, and status/signup trends across every organization.
   */
  async summary(): Promise<OrganizationSummaryResponse> {
    const trendStart = new Date();
    trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));
    trendStart.setHours(0, 0, 0, 0);

    const [
      totalOrganizations,
      pendingApprovals,
      totalUsers,
      statusGroups,
      recentOrganizations,
    ] = await Promise.all([
      this.prisma.organization.count(),
      this.prisma.organization.count({ where: { status: 'PENDING' } }),
      this.prisma.user.count(),
      this.prisma.organization.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.organization.findMany({
        where: { createdAt: { gte: trendStart } },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalOrganizations,
      pendingApprovals,
      totalUsers,
      statusBreakdown: statusGroups.map((g) => ({
        status: g.status,
        count: g._count,
      })),
      organizationsPerDay: bucketByDay(
        recentOrganizations.map((o) => o.createdAt),
        TREND_DAYS,
      ),
    };
  }

  /**
   * Get all organizations with optional status filter
   */
  async findAll(options: {
    status?: OrganizationStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<OrganizationListResponse> {
    const { status, search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const trimmedSearch = search?.trim();
    const where: Prisma.OrganizationWhereInput = {
      ...(status ? { status } : {}),
      ...(trimmedSearch
        ? { name: { contains: trimmedSearch, mode: 'insensitive' } }
        : {}),
    };

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          website: true,
          logoUrl: true,
          createdAt: true,
          createdBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { organizations, total };
  }

  /**
   * Get a single organization by ID with full details
   */
  async findOne(id: string): Promise<OrganizationDetailResponse> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        description: true,
        website: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  /**
   * ORG_ADMIN self-service update of their own library's branding/profile.
   * Never touches `status` (that stays a SUPER_ADMIN action). A changed slug is
   * re-checked for global uniqueness, same as registration.
   */
  async updateProfile(
    id: string,
    dto: OrganizationUpdateRequest,
  ): Promise<OrganizationDetailResponse> {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (dto.slug) {
      const clash = await this.prisma.organization.findFirst({
        where: { slug: dto.slug, id: { not: id } },
        select: { id: true },
      });
      if (clash) {
        throw new ConflictException(
          `The slug "${dto.slug}" is already taken. Please choose another.`,
        );
      }
    }

    // Undefined fields are left untouched by Prisma; only branding is editable.
    await this.prisma.organization.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        website: dto.website,
        logoUrl: dto.logoUrl,
      },
    });

    return this.findOne(id);
  }

  /**
   * Approve an organization (set status to ACTIVE)
   */
  async approve(
    id: string,
    approvedById: string,
  ): Promise<OrganizationDetailResponse> {
    // Check if organization exists
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedById,
        approvedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        description: true,
        website: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return organization;
  }

  /**
   * Reject an organization (set status to REJECTED)
   */
  async reject(id: string): Promise<OrganizationDetailResponse> {
    // Check if organization exists
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        description: true,
        website: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return organization;
  }

  /**
   * Deactivate an approved library (ACTIVE -> SUSPENDED).
   * Only valid for a currently-ACTIVE org; PENDING/REJECTED use approve/reject.
   */
  async deactivate(id: string): Promise<OrganizationDetailResponse> {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!existing) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (existing.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Only an ACTIVE library can be deactivated (current status: ${existing.status}).`,
      );
    }

    return this.prisma.organization.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        description: true,
        website: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });
  }

  /**
   * Reactivate a deactivated library (SUSPENDED/INACTIVE -> ACTIVE).
   */
  async activate(id: string): Promise<OrganizationDetailResponse> {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
      select: { status: true },
    });

    if (!existing) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (existing.status !== 'SUSPENDED' && existing.status !== 'INACTIVE') {
      throw new BadRequestException(
        `Only a SUSPENDED or INACTIVE library can be activated (current status: ${existing.status}).`,
      );
    }

    return this.prisma.organization.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        description: true,
        website: true,
        logoUrl: true,
        createdAt: true,
        updatedAt: true,
        approvedAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });
  }
}
