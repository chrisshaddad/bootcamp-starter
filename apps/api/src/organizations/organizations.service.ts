import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import type { OrganizationStatus } from '@repo/db';
import type {
  CreateOrganizationRequest,
  OrganizationListResponse,
  OrganizationDetailResponse,
  OrganizationRegisterResponse,
} from '@repo/contracts';

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
   * Get all organizations with optional status filter
   */
  async findAll(options: {
    status?: OrganizationStatus;
    page?: number;
    limit?: number;
  }): Promise<OrganizationListResponse> {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

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
              users: true,
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
            users: true,
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
            users: true,
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
            users: true,
          },
        },
      },
    });

    return organization;
  }
}
