import { Injectable, Logger } from '@nestjs/common';
import type { User } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { resolveOrganizationScope } from '../common/organization-scope';
import type { MemberListQuery, MemberListResponse } from '@repo/contracts';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: MemberListQuery,
    user: User,
  ): Promise<MemberListResponse> {
    const { page = 1, limit = 20, organizationId: requestedOrgId } = query;
    const skip = (page - 1) * limit;

    const organizationId = resolveOrganizationScope(user, requestedOrgId);
    const where = organizationId ? { organizationId } : {};

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          role: true,
          organizationId: true,
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    this.logger.log(`Listed ${members.length} members (total: ${total})`);

    return { members, total };
  }
}
