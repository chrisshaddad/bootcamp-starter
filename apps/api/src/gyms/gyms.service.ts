import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { MAIL_QUEUE, MAIL_JOBS } from '../mail/mail.constants';
import type { GymStatus } from '@repo/db';
import type {
  GymListResponse,
  GymDetailResponse,
  GymRegisterRequest,
} from '@repo/contracts';

const GYM_DETAIL_SELECT = {
  id: true,
  name: true,
  status: true,
  description: true,
  website: true,
  phone: true,
  address: true,
  statusReason: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  createdBy: {
    select: { id: true, email: true, name: true },
  },
  approvedBy: {
    select: { id: true, email: true, name: true },
  },
  _count: {
    select: { users: true, members: true },
  },
} as const;

@Injectable()
export class GymsService {
  private readonly logger = new Logger(GymsService.name);

  constructor(
    private readonly prisma: DatabaseService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  /** Get all gyms with optional status filter */
  async findAll(options: {
    status?: GymStatus;
    page?: number;
    limit?: number;
  }): Promise<GymListResponse> {
    const { status, page = 1, limit = 20 } = options;
    if (page < 1) throw new BadRequestException('page must be >= 1');
    if (limit < 1) throw new BadRequestException('limit must be >= 1');
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [gyms, total] = await Promise.all([
      this.prisma.gym.findMany({
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
            select: { id: true, email: true, name: true },
          },
          _count: {
            select: { users: true },
          },
        },
      }),
      this.prisma.gym.count({ where }),
    ]);

    return { gyms, total };
  }

  /** Get a single gym by ID with full details */
  async findOne(id: string): Promise<GymDetailResponse> {
    const gym = await this.prisma.gym.findUnique({
      where: { id },
      select: GYM_DETAIL_SELECT,
    });

    if (!gym) {
      throw new NotFoundException(`Gym with ID ${id} not found`);
    }

    return gym;
  }

  /** Approve a gym (set status to ACTIVE) and send the owner a login link */
  async approve(id: string, approvedById: string): Promise<GymDetailResponse> {
    const existing = await this.prisma.gym.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Gym with ID ${id} not found`);
    }

    const gym = await this.prisma.gym.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        approvedById,
        approvedAt: new Date(),
        statusReason: null,
      },
      select: GYM_DETAIL_SELECT,
    });

    const owner = gym.createdBy;
    if (owner) {
      await this.prisma.magicLink.updateMany({
        where: {
          userId: owner.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await this.prisma.magicLink.create({
        data: { userId: owner.id, token, expiresAt },
      });

      const magicLinkUrl = `${process.env.APP_URL}/auth/verify?token=${token}`;
      await this.mailQueue.add(MAIL_JOBS.SEND_MAGIC_LINK, {
        email: owner.email,
        magicLink: magicLinkUrl,
        userName: owner.name,
      });
    }

    this.logger.log(`Gym approved: ${id} (by: ${approvedById})`);
    return gym;
  }

  /** Reject a gym with a mandatory reason */
  async reject(id: string, reason: string): Promise<GymDetailResponse> {
    const existing = await this.prisma.gym.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Gym with ID ${id} not found`);
    }

    const gym = await this.prisma.gym.update({
      where: { id },
      data: { status: 'REJECTED', statusReason: reason },
      select: GYM_DETAIL_SELECT,
    });
    this.logger.log(`Gym rejected: ${id}`);
    return gym;
  }

  /** Suspend an active gym with a mandatory reason and immediately log out the owner */
  async suspend(id: string, reason: string): Promise<GymDetailResponse> {
    const gym = await this.prisma.gym.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!gym) {
      throw new NotFoundException(`Gym with ID ${id} not found`);
    }

    const updated = await this.prisma.gym.update({
      where: { id },
      data: { status: 'SUSPENDED', statusReason: reason },
      select: GYM_DETAIL_SELECT,
    });

    this.logger.log(`Gym suspended: ${id}`);
    return updated;
  }

  /** Reactivate a suspended gym and send the owner a new login link */
  async reactivate(id: string): Promise<GymDetailResponse> {
    const existing = await this.prisma.gym.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Gym with ID ${id} not found`);
    }

    const gym = await this.prisma.gym.update({
      where: { id },
      data: { status: 'ACTIVE', statusReason: null },
      select: GYM_DETAIL_SELECT,
    });

    const owner = gym.createdBy;
    if (owner) {
      await this.prisma.magicLink.updateMany({
        where: {
          userId: owner.id,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { usedAt: new Date() },
      });

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await this.prisma.magicLink.create({
        data: { userId: owner.id, token, expiresAt },
      });

      const magicLinkUrl = `${process.env.APP_URL}/auth/verify?token=${token}`;
      await this.mailQueue.add(MAIL_JOBS.SEND_MAGIC_LINK, {
        email: owner.email,
        magicLink: magicLinkUrl,
        userName: owner.name,
      });
    }

    this.logger.log(`Gym reactivated: ${id}`);
    return gym;
  }

  /** Register a new gym and owner account, queue a pending-approval notification email */
  async register(
    dto: GymRegisterRequest,
  ): Promise<{ message: string; gymId: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    let user: Awaited<ReturnType<typeof this.prisma.user.create>>;
    let gym: Awaited<ReturnType<typeof this.prisma.gym.create>>;
    try {
      ({ user, gym } = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            email: dto.email.toLowerCase(),
            name: dto.ownerName,
            role: 'ORG_ADMIN',
            isConfirmed: false,
          },
        });
        const g = await tx.gym.create({
          data: {
            name: dto.name,
            description: dto.description ?? null,
            website: dto.website || null,
            phone: dto.phone,
            address: dto.address,
            status: 'PENDING',
            createdById: u.id,
          },
        });
        await tx.user.update({
          where: { id: u.id },
          data: { gymId: g.id },
        });
        return { user: u, gym: g };
      }));
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const target = err.meta?.target as string[] | undefined;
        if (target?.includes('email')) {
          throw new ConflictException('A user with this email already exists');
        }
        throw new ConflictException(
          'A gym with this name is already registered',
        );
      }
      throw err;
    }

    await this.mailQueue.add(MAIL_JOBS.SEND_GYM_PENDING, {
      email: user.email,
      userName: user.name,
      gymName: gym.name,
    });

    this.logger.log(`Gym registered: ${gym.id} (owner: ${user.id})`);
    return {
      message:
        'Gym registration submitted. You will receive a login link by email once your application is approved.',
      gymId: gym.id,
    };
  }
}
