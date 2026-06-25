import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type { MemberStatus } from '@repo/db';
import type {
  MemberListResponse,
  MemberResponse,
  MemberCreateRequest,
  MemberUpdateRequest,
  MessageResponse,
} from '@repo/contracts';
import { MAIL_QUEUE, MAIL_JOBS } from '../mail/mail.constants';

const MAGIC_LINK_EXPIRY_MINUTES = 15;

const MEMBER_SELECT = {
  id: true,
  gymId: true,
  userId: true,
  name: true,
  email: true,
  phoneNumber: true,
  dateOfBirth: true,
  status: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  /** List all members for a gym with optional status filter and pagination */
  async findAll(
    gymId: string,
    options: { status?: MemberStatus; page?: number; limit?: number },
  ): Promise<MemberListResponse> {
    const { status, page = 1, limit = 20 } = options;
    if (page < 1 || limit < 1) {
      throw new BadRequestException('page and limit must be positive integers');
    }
    const skip = (page - 1) * limit;
    const where = { gymId, ...(status ? { status } : {}) };

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: MEMBER_SELECT,
      }),
      this.prisma.member.count({ where }),
    ]);

    return { members, total };
  }

  /** Get a single member by ID, scoped to the caller's gym */
  async findOne(id: string, gymId: string): Promise<MemberResponse> {
    const member = await this.prisma.member.findFirst({
      where: { id, gymId },
      select: MEMBER_SELECT,
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    return member;
  }

  /** Create a new member in the caller's gym */
  async create(
    gymId: string,
    dto: MemberCreateRequest,
  ): Promise<MemberResponse> {
    const normalizedEmail = dto.email.toLowerCase();

    const emailConflict = await this.prisma.member.findFirst({
      where: { gymId, email: normalizedEmail },
      select: { id: true },
    });
    if (emailConflict) {
      throw new ConflictException(
        'A member with this email already exists in this gym',
      );
    }

    const phoneConflict = await this.prisma.member.findFirst({
      where: { gymId, phoneNumber: dto.phoneNumber },
      select: { id: true },
    });
    if (phoneConflict) {
      throw new ConflictException(
        'A member with this phone number already exists in this gym',
      );
    }

    try {
      return await this.prisma.member.create({
        data: {
          gymId,
          name: dto.name,
          email: normalizedEmail,
          phoneNumber: dto.phoneNumber,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        },
        select: MEMBER_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A member with this email or phone number already exists in this gym',
        );
      }
      throw err;
    }
  }

  /** Provision a portal User for the member and send a magic-link invite email */
  async invite(memberId: string, gymId: string): Promise<MessageResponse> {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, gymId },
    });
    if (!member) {
      throw new NotFoundException(`Member with ID ${memberId} not found`);
    }

    if (member.userId) {
      throw new ConflictException(
        'This member has already been invited to the portal',
      );
    }

    // Reject if another user with this email already exists (e.g. from another gym)
    const existingUser = await this.prisma.user.findUnique({
      where: { email: member.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException(
        'A user account for this email already exists',
      );
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(
      Date.now() + MAGIC_LINK_EXPIRY_MINUTES * 60 * 1000,
    );

    // Provision User, link Member, and create magic link in one atomic transaction.
    // All three writes succeed or none do — no partial invite state can be left behind.
    const portalUser = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: member.email.toLowerCase(),
          name: member.name,
          role: 'MEMBER',
          gymId,
          isConfirmed: false,
        },
      });

      await tx.member.update({
        where: { id: memberId },
        data: { userId: user.id },
      });

      await tx.magicLink.create({
        data: { userId: user.id, token, expiresAt },
      });

      return user;
    });

    const appUrl = process.env.APP_URL;
    const magicLinkUrl = `${appUrl}/auth/verify?token=${token}`;

    // jobId makes re-enqueue idempotent on retry; catch transient queue failures so
    // a Redis blip doesn't strand an already-committed invite (magic link is in DB).
    try {
      await this.mailQueue.add(
        MAIL_JOBS.SEND_MAGIC_LINK,
        {
          email: portalUser.email,
          magicLink: magicLinkUrl,
          userName: portalUser.name,
        },
        { jobId: token },
      );
    } catch (err) {
      this.logger.error(
        `Invite email enqueue failed for user ${portalUser.id}: ${(err as Error).message}`,
      );
    }

    this.logger.log(
      `Portal invite sent to member ${memberId} (user ${portalUser.id})`,
    );

    return { message: 'Portal invite sent successfully' };
  }

  /** Update a member's details or status, scoped to the caller's gym */
  async update(
    id: string,
    gymId: string,
    dto: MemberUpdateRequest,
  ): Promise<MemberResponse> {
    const existing = await this.prisma.member.findFirst({
      where: { id, gymId },
    });
    if (!existing) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    if (
      dto.phoneNumber !== undefined &&
      dto.phoneNumber !== existing.phoneNumber
    ) {
      const phoneConflict = await this.prisma.member.findFirst({
        where: { gymId, phoneNumber: dto.phoneNumber, id: { not: id } },
        select: { id: true },
      });
      if (phoneConflict) {
        throw new ConflictException(
          'A member with this phone number already exists in this gym',
        );
      }
    }

    try {
      return await this.prisma.member.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.phoneNumber !== undefined && {
            phoneNumber: dto.phoneNumber,
          }),
          ...(dto.dateOfBirth !== undefined && {
            dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
          }),
          ...(dto.status !== undefined && { status: dto.status }),
        },
        select: MEMBER_SELECT,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A member with this phone number already exists in this gym',
        );
      }
      throw err;
    }
  }
}
