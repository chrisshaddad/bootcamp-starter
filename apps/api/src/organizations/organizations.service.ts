import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { OrganizationStatus } from '@repo/db';
import type {
  OrganizationListResponse,
  OrganizationDetailResponse,
} from '@repo/contracts';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

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
      select: {
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
      },
    });

    return organization;
  }

  /**
   * Update organization details (name, description, website)
   */
  async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      website?: string | null;
    },
  ): Promise<OrganizationDetailResponse> {
    const existing = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.website !== undefined && { website: data.website }),
      },
      select: {
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
      },
    });

    return organization;
  }
}
