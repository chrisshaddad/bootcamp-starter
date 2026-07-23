import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import type { OrganizationStatus } from '@repo/db';
import type {
  OrganizationListResponse,
  OrganizationDetailResponse,
  OrganizationCreateRequest,
  OrganizationUpdateRequest,
} from '@repo/contracts';

const detailSelect = {
  id: true,
  name: true,
  status: true,
  description: true,
  website: true,
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
} satisfies Prisma.OrganizationSelect;

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

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
          status: true,
          website: true,
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
      select: detailSelect,
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return organization;
  }

  /**
   * Create an organization together with its initial ORG_ADMIN, auto-approved
   * by the calling Super Admin (skips the self-registration PENDING flow).
   * The new admin is sent an invitation email to sign in.
   */
  async create(
    data: OrganizationCreateRequest,
    currentUser: { id: string; name: string },
  ): Promise<OrganizationDetailResponse> {
    const email = data.adminEmail.toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    const organization = await this.prisma.$transaction(async (tx) => {
      // Organization.createdById references an existing User, so the admin
      // has to be created first (with no organization yet - the self-relation
      // is circular).
      const admin = await tx.user.create({
        data: {
          email,
          name: data.adminName,
          role: 'ORG_ADMIN',
        },
      });

      const org = await tx.organization.create({
        data: {
          name: data.name,
          description: data.description,
          website: data.website,
          requiresManagerApproval: data.requiresManagerApproval ?? false,
          createdById: admin.id,
          approvedById: currentUser.id,
          status: 'ACTIVE',
          approvedAt: new Date(),
        },
      });

      await tx.user.update({
        where: { id: admin.id },
        data: { organizationId: org.id },
      });

      // Re-fetch with the full select after linking the admin to the org, so
      // `_count.users` reflects them (it would read 0 if selected on create,
      // before the org's own id existed to link back to).
      return tx.organization.findUniqueOrThrow({
        where: { id: org.id },
        select: detailSelect,
      });
    });

    await this.authService.createInvitation(
      { id: organization.createdBy.id, email, name: data.adminName },
      currentUser.name,
      organization.name,
    );

    return organization;
  }

  /**
   * Update an organization's editable profile fields
   */
  async update(
    id: string,
    data: OrganizationUpdateRequest,
  ): Promise<OrganizationDetailResponse> {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        website: data.website,
        requiresManagerApproval: data.requiresManagerApproval,
      },
      select: detailSelect,
    });
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

    return this.prisma.organization.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedById,
        approvedAt: new Date(),
      },
      select: detailSelect,
    });
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

    return this.prisma.organization.update({
      where: { id },
      data: {
        status: 'REJECTED',
      },
      select: detailSelect,
    });
  }

  /**
   * Suspend an active organization
   */
  async suspend(id: string): Promise<OrganizationDetailResponse> {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (existing.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Only active organizations can be suspended',
      );
    }

    return this.prisma.organization.update({
      where: { id },
      data: { status: 'SUSPENDED' },
      select: detailSelect,
    });
  }

  /**
   * Reactivate a suspended organization
   */
  async reactivate(id: string): Promise<OrganizationDetailResponse> {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    if (existing.status !== 'SUSPENDED') {
      throw new BadRequestException(
        'Only suspended organizations can be reactivated',
      );
    }

    return this.prisma.organization.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: detailSelect,
    });
  }
}
