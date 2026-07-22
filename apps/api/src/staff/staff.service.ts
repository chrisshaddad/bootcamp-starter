import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import type {
  StaffListResponse,
  StaffResponse,
  StaffInviteRequest,
  StaffRoleUpdateRequest,
} from '@repo/contracts';

const STAFF_ROLES = ['ORG_ADMIN', 'LIBRARIAN'] as const;

const staffSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isConfirmed: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /**
   * List the library's staff (ORG_ADMIN + LIBRARIAN users pinned to this org).
   */
  async findAll(
    organizationId: string,
    options: { search?: string } = {},
  ): Promise<StaffListResponse> {
    const search = options.search?.trim();
    const where: Prisma.UserWhereInput = {
      organizationId,
      role: { in: [...STAFF_ROLES] },
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [staff, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        select: staffSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { staff: staff as StaffResponse[], total };
  }

  /**
   * Invite a staff member: create a login User pinned to this library (defaults
   * to LIBRARIAN) and email them a magic sign-in link. One login per person, so
   * an already-registered email is rejected.
   */
  async invite(
    organizationId: string,
    data: StaffInviteRequest,
  ): Promise<StaffResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        `An account with the email "${data.email}" already exists.`,
      );
    }

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role ?? 'LIBRARIAN',
        organizationId,
      },
      select: staffSelect,
    });

    // Reuse the shared magic-link flow (token + Mailpit); confirms on verify.
    await this.authService.requestMagicLink(data.email);

    return user as StaffResponse;
  }

  /**
   * Change a staff member's role within this library. Guards against a self
   * change and against demoting the last remaining admin (library lockout).
   */
  async changeRole(
    organizationId: string,
    id: string,
    actingUserId: string,
    data: StaffRoleUpdateRequest,
  ): Promise<StaffResponse> {
    const target = await this.requireStaff(organizationId, id);

    if (id === actingUserId) {
      throw new BadRequestException('You cannot change your own role.');
    }

    if (target.role === 'ORG_ADMIN' && data.role !== 'ORG_ADMIN') {
      await this.assertNotLastAdmin(organizationId);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: data.role },
      select: staffSelect,
    });

    return updated as StaffResponse;
  }

  /**
   * Remove a staff member from this library by unlinking them from the org
   * (User.organizationId = null). The platform login is left intact; re-invite
   * to restore. Guards against removing yourself or the last admin.
   */
  async remove(
    organizationId: string,
    id: string,
    actingUserId: string,
  ): Promise<void> {
    const target = await this.requireStaff(organizationId, id);

    if (id === actingUserId) {
      throw new BadRequestException(
        'You cannot remove yourself from the library.',
      );
    }

    if (target.role === 'ORG_ADMIN') {
      await this.assertNotLastAdmin(organizationId);
    }

    await this.prisma.user.update({
      where: { id },
      data: { organizationId: null },
    });
  }

  private async requireStaff(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, role: { in: [...STAFF_ROLES] } },
    });

    if (!user) {
      throw new NotFoundException(`Staff member with ID ${id} not found`);
    }

    return user;
  }

  private async assertNotLastAdmin(organizationId: string): Promise<void> {
    const admins = await this.prisma.user.count({
      where: { organizationId, role: 'ORG_ADMIN' },
    });

    if (admins <= 1) {
      throw new BadRequestException(
        'The library must have at least one admin.',
      );
    }
  }
}
