import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@repo/db';
import type {
  Group,
  GroupCreateRequest,
  GroupDetailResponse,
  GroupListQuery,
  GroupListResponse,
  GroupMembersAssignRequest,
  GroupUpdateRequest,
} from '@repo/contracts';
import { resolveOrganizationScope } from '../common/organization-scope';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private toGroup(
    group: {
      id: string;
      name: string;
      description: string | null;
      organizationId: string;
      createdAt: Date;
      updatedAt: Date;
    },
    memberCount: number,
  ): Group {
    return {
      id: group.id,
      name: group.name,
      description: group.description,
      organizationId: group.organizationId,
      memberCount,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  private async getScopedGroup(id: string, user: User) {
    const organizationId = resolveOrganizationScope(user);
    const group = await this.prisma.group.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        name: true,
        description: true,
        organizationId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!group) {
      throw new NotFoundException(`Group with ID ${id} not found`);
    }

    return group;
  }

  private async assertMembersInOrganization(
    memberIds: string[],
    organizationId: string,
  ): Promise<void> {
    const uniqueIds = [...new Set(memberIds)];
    const members = await this.prisma.member.findMany({
      where: {
        id: { in: uniqueIds },
        organizationId,
      },
      select: { id: true },
    });

    if (members.length !== uniqueIds.length) {
      throw new BadRequestException(
        'All members must belong to the same organization as the group',
      );
    }
  }

  async findAll(query: GroupListQuery, user: User): Promise<GroupListResponse> {
    const { page = 1, limit = 20, organizationId: requestedOrgId } = query;
    const skip = (page - 1) * limit;
    const organizationId = resolveOrganizationScope(user, requestedOrgId);

    const where: Prisma.GroupWhereInput = {
      ...(organizationId ? { organizationId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.group.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { memberships: true } },
        },
      }),
      this.prisma.group.count({ where }),
    ]);

    return {
      groups: rows.map((row) => this.toGroup(row, row._count.memberships)),
      total,
    };
  }

  async findOne(id: string, user: User): Promise<GroupDetailResponse> {
    const group = await this.getScopedGroup(id, user);

    const memberships = await this.prisma.groupMember.findMany({
      where: { groupId: group.id },
      orderBy: { createdAt: 'asc' },
      select: {
        member: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    const members = memberships.map((m) => m.member);

    return {
      ...this.toGroup(group, members.length),
      members,
    };
  }

  async create(
    body: GroupCreateRequest,
    user: User,
  ): Promise<GroupDetailResponse> {
    const organizationId = resolveOrganizationScope(user, body.organizationId);

    if (!organizationId) {
      throw new BadRequestException(
        'organizationId is required when creating a group',
      );
    }

    try {
      const group = await this.prisma.group.create({
        data: {
          name: body.name,
          description: body.description ?? null,
          organizationId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          organizationId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      this.logger.log(`Created group ${group.id} in org ${organizationId}`);
      return { ...this.toGroup(group, 0), members: [] };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A group with this name already exists in the organization',
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    body: GroupUpdateRequest,
    user: User,
  ): Promise<GroupDetailResponse> {
    const scoped = await this.getScopedGroup(id, user);

    try {
      await this.prisma.group.update({
        where: { id: scoped.id },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.description !== undefined
            ? { description: body.description }
            : {}),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A group with this name already exists in the organization',
        );
      }
      throw error;
    }

    this.logger.log(`Updated group ${scoped.id}`);
    return this.findOne(scoped.id, user);
  }

  async remove(id: string, user: User): Promise<void> {
    const scoped = await this.getScopedGroup(id, user);

    await this.prisma.group.delete({
      where: { id: scoped.id },
    });

    this.logger.log(`Deleted group ${scoped.id}`);
  }

  async assignMembers(
    id: string,
    body: GroupMembersAssignRequest,
    user: User,
  ): Promise<GroupDetailResponse> {
    const scoped = await this.getScopedGroup(id, user);
    const uniqueIds = [...new Set(body.memberIds)];

    await this.assertMembersInOrganization(uniqueIds, scoped.organizationId);

    const existing = await this.prisma.groupMember.findMany({
      where: {
        groupId: scoped.id,
        memberId: { in: uniqueIds },
      },
      select: { memberId: true },
    });
    const existingIds = new Set(existing.map((row) => row.memberId));
    const toCreate = uniqueIds.filter((memberId) => !existingIds.has(memberId));

    if (toCreate.length > 0) {
      await this.prisma.groupMember.createMany({
        data: toCreate.map((memberId) => ({
          groupId: scoped.id,
          memberId,
        })),
        skipDuplicates: true,
      });
    }

    this.logger.log(
      `Assigned ${toCreate.length} members to group ${scoped.id}`,
    );
    return this.findOne(scoped.id, user);
  }

  async removeMember(
    id: string,
    memberId: string,
    user: User,
  ): Promise<GroupDetailResponse> {
    const scoped = await this.getScopedGroup(id, user);

    const membership = await this.prisma.groupMember.findFirst({
      where: {
        groupId: scoped.id,
        memberId,
      },
      select: { id: true },
    });

    if (!membership) {
      throw new NotFoundException(
        `Member ${memberId} is not in group ${scoped.id}`,
      );
    }

    await this.prisma.groupMember.delete({
      where: { id: membership.id },
    });

    this.logger.log(`Removed member ${memberId} from group ${scoped.id}`);
    return this.findOne(scoped.id, user);
  }
}
