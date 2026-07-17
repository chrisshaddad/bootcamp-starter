import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { createHash, randomBytes } from 'crypto';
import type { MemberRole, User } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { resolveOrganizationScope } from '../common/organization-scope';
import { SessionService } from '../auth/session.service';
import { MAIL_JOBS, MAIL_QUEUE } from '../mail/mail.constants';
import type {
  Member,
  MemberActionResponse,
  MemberCreateRequest,
  MemberInvitation,
  MemberInvitationAcceptResponse,
  MemberInvitationActionResponse,
  MemberInviteRequest,
  MemberListQuery,
  MemberInvitationListResponse,
  MemberListResponse,
  MemberUpdateRequest,
  UserResponse,
} from '@repo/contracts';

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private mapMember(member: {
    id: string;
    username: string;
    role: MemberRole;
    organizationId: string;
    userId?: string | null;
    user?: { email: string } | null;
  }): Member {
    return {
      id: member.id,
      username: member.username,
      role: member.role,
      organizationId: member.organizationId,
      userId: member.userId ?? null,
      userEmail: member.user?.email ?? null,
    };
  }

  private mapInvitation(invitation: {
    id: string;
    email: string;
    username: string;
    role: MemberRole;
    organizationId: string;
    invitedById: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
  }): MemberInvitation {
    return {
      id: invitation.id,
      email: invitation.email,
      username: invitation.username,
      role: invitation.role,
      organizationId: invitation.organizationId,
      invitedById: invitation.invitedById,
      expiresAt: invitation.expiresAt.toISOString(),
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
      revokedAt: invitation.revokedAt?.toISOString() ?? null,
      createdAt: invitation.createdAt.toISOString(),
    };
  }

  private mapUserResponse(
    user: Pick<
      User,
      'id' | 'email' | 'name' | 'role' | 'organizationId' | 'isConfirmed'
    >,
    memberRole: MemberRole | null,
  ): UserResponse {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      isConfirmed: user.isConfirmed,
      memberRole,
    };
  }

  private resolveRequiredOrganizationScope(
    user: User,
    requestedOrganizationId?: string,
  ): string {
    const organizationId = resolveOrganizationScope(
      user,
      requestedOrganizationId,
    );

    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    return organizationId;
  }

  private async getScopedMember(id: string, user: User) {
    const organizationId = resolveOrganizationScope(user);
    const member = await this.prisma.member.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  private async assertUsernameAvailable(
    organizationId: string,
    username: string,
    excludingMemberId?: string,
  ): Promise<void> {
    const existing = await this.prisma.member.findFirst({
      where: {
        organizationId,
        username,
        ...(excludingMemberId ? { id: { not: excludingMemberId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('A member with this username already exists');
    }
  }

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
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    this.logger.log(`Listed ${members.length} members (total: ${total})`);

    return { members: members.map((member) => this.mapMember(member)), total };
  }

  async findOne(id: string, user: User): Promise<MemberActionResponse> {
    const member = await this.getScopedMember(id, user);
    return { member: this.mapMember(member) };
  }

  async create(
    body: MemberCreateRequest,
    user: User,
  ): Promise<MemberActionResponse> {
    const organizationId = this.resolveRequiredOrganizationScope(
      user,
      body.organizationId,
    );

    await this.assertUsernameAvailable(organizationId, body.username);

    const member = await this.prisma.member.create({
      data: {
        username: body.username,
        role: body.role,
        organizationId,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    this.logger.log(`Created member ${member.id} in org ${organizationId}`);
    return { member: this.mapMember(member) };
  }

  async update(
    id: string,
    body: MemberUpdateRequest,
    user: User,
  ): Promise<MemberActionResponse> {
    const existing = await this.getScopedMember(id, user);

    if (body.username && body.username !== existing.username) {
      await this.assertUsernameAvailable(
        existing.organizationId,
        body.username,
        existing.id,
      );
    }

    const member = await this.prisma.member.update({
      where: { id: existing.id },
      data: {
        ...(body.username ? { username: body.username } : {}),
        ...(body.role ? { role: body.role } : {}),
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    this.logger.log(`Updated member ${member.id}`);
    return { member: this.mapMember(member) };
  }

  async remove(id: string, user: User): Promise<MemberActionResponse> {
    const existing = await this.getScopedMember(id, user);
    const member = await this.prisma.member.delete({
      where: { id: existing.id },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    this.logger.log(`Deleted member ${member.id}`);
    return { member: this.mapMember(member) };
  }

  async findInvitations(
    query: MemberListQuery,
    user: User,
  ): Promise<MemberInvitationListResponse> {
    const { page = 1, limit = 20, organizationId: requestedOrgId } = query;
    const skip = (page - 1) * limit;
    const organizationId = resolveOrganizationScope(user, requestedOrgId);
    const where = {
      ...(organizationId ? { organizationId } : {}),
      acceptedAt: null,
      revokedAt: null,
    };

    const [invitations, total] = await Promise.all([
      this.prisma.memberInvitation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.memberInvitation.count({ where }),
    ]);

    return {
      invitations: invitations.map((invitation) =>
        this.mapInvitation(invitation),
      ),
      total,
    };
  }

  async invite(
    body: MemberInviteRequest,
    user: User,
  ): Promise<MemberInvitationActionResponse> {
    const organizationId = this.resolveRequiredOrganizationScope(
      user,
      body.organizationId,
    );

    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    await this.assertUsernameAvailable(organizationId, body.username);

    const existingUser = await this.prisma.user.findUnique({
      where: { email: body.email },
      select: {
        id: true,
        role: true,
        organizationId: true,
      },
    });

    if (existingUser?.role === 'SUPER_ADMIN') {
      throw new ConflictException('Super admins cannot be invited as members');
    }

    if (
      existingUser?.organizationId &&
      existingUser.organizationId !== organizationId
    ) {
      throw new ConflictException(
        'This user already belongs to another organization',
      );
    }

    if (existingUser) {
      const existingMembership = await this.prisma.member.findFirst({
        where: { userId: existingUser.id },
        select: { id: true },
      });

      if (existingMembership) {
        throw new ConflictException('This user is already linked to a member');
      }
    }

    const existingInvitation = await this.prisma.memberInvitation.findFirst({
      where: {
        organizationId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
        OR: [{ email: body.email }, { username: body.username }],
      },
      select: { id: true },
    });

    if (existingInvitation) {
      throw new ConflictException(
        'An active invitation already exists for this email or username',
      );
    }

    const token = randomBytes(32).toString('hex');
    const invitation = await this.prisma.memberInvitation.create({
      data: {
        email: body.email,
        username: body.username,
        role: body.role,
        organizationId,
        invitedById: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(
          Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const invitationLink = `${appUrl}/invite/accept?token=${token}`;

    await this.mailQueue.add(MAIL_JOBS.SEND_INVITATION, {
      email: invitation.email,
      inviterName: user.name,
      organizationName: organization.name,
      invitationLink,
    });

    this.logger.log(`Queued member invitation ${invitation.id}`);
    return { invitation: this.mapInvitation(invitation) };
  }

  async resendInvitation(
    id: string,
    user: User,
  ): Promise<MemberInvitationActionResponse> {
    const organizationId = resolveOrganizationScope(user);
    const invitation = await this.prisma.memberInvitation.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
        acceptedAt: null,
        revokedAt: null,
      },
      include: {
        organization: {
          select: { name: true },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const token = randomBytes(32).toString('hex');
    const updated = await this.prisma.memberInvitation.update({
      where: { id: invitation.id },
      data: {
        tokenHash: this.hashToken(token),
        expiresAt: new Date(
          Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        ),
      },
    });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const invitationLink = `${appUrl}/invite/accept?token=${token}`;

    await this.mailQueue.add(MAIL_JOBS.SEND_INVITATION, {
      email: invitation.email,
      inviterName: user.name,
      organizationName: invitation.organization.name,
      invitationLink,
    });

    this.logger.log(`Resent member invitation ${invitation.id}`);
    return { invitation: this.mapInvitation(updated) };
  }

  async revokeInvitation(
    id: string,
    user: User,
  ): Promise<MemberInvitationActionResponse> {
    const organizationId = resolveOrganizationScope(user);
    const invitation = await this.prisma.memberInvitation.findFirst({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
        acceptedAt: null,
        revokedAt: null,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const updated = await this.prisma.memberInvitation.update({
      where: { id: invitation.id },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`Revoked member invitation ${invitation.id}`);
    return { invitation: this.mapInvitation(updated) };
  }

  async acceptInvitation(
    token: string,
  ): Promise<{ sessionId: string } & MemberInvitationAcceptResponse> {
    const invitation = await this.prisma.memberInvitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    if (invitation.acceptedAt) {
      throw new BadRequestException(
        'This invitation has already been accepted',
      );
    }

    if (invitation.revokedAt || invitation.expiresAt < new Date()) {
      throw new NotFoundException('Invalid or expired invitation');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email },
      });

      if (existingUser?.role === 'SUPER_ADMIN') {
        throw new ForbiddenException(
          'Super admins cannot accept member invitations',
        );
      }

      if (
        existingUser?.organizationId &&
        existingUser.organizationId !== invitation.organizationId
      ) {
        throw new ConflictException(
          'This user already belongs to another organization',
        );
      }

      if (existingUser) {
        const existingMembership = await tx.member.findFirst({
          where: { userId: existingUser.id },
          select: { id: true },
        });

        if (existingMembership) {
          throw new ConflictException(
            'This user is already linked to a member',
          );
        }
      }

      const existingUsername = await tx.member.findFirst({
        where: {
          organizationId: invitation.organizationId,
          username: invitation.username,
        },
        select: { id: true },
      });

      if (existingUsername) {
        throw new ConflictException(
          'A member with this username already exists',
        );
      }

      const userRecord = existingUser
        ? await tx.user.update({
            where: { id: existingUser.id },
            data: {
              organizationId: invitation.organizationId,
              isConfirmed: true,
            },
          })
        : await tx.user.create({
            data: {
              email: invitation.email,
              name: invitation.username,
              role: 'MEMBER',
              organizationId: invitation.organizationId,
              isConfirmed: true,
            },
          });

      const member = await tx.member.create({
        data: {
          username: invitation.username,
          role: invitation.role,
          organizationId: invitation.organizationId,
          userId: userRecord.id,
        },
      });

      await tx.memberInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return { userRecord, memberRole: member.role };
    });

    const sessionId = await this.sessionService.createSession(
      result.userRecord.id,
    );

    this.logger.log(`Accepted member invitation ${invitation.id}`);

    return {
      sessionId,
      user: this.mapUserResponse(result.userRecord, result.memberRole),
    };
  }
}
