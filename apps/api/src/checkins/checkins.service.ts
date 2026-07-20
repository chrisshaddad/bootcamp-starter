import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import Redis from 'ioredis';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { User } from '@repo/db';
import type {
  CheckInResponse,
  CheckInListResponse,
  CheckinQrTokenResponse,
} from '@repo/contracts';

const CHECKIN_SELECT = {
  id: true,
  gymId: true,
  memberId: true,
  checkedInAt: true,
  checkedOutAt: true,
  updatedAt: true,
  member: {
    select: {
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
    },
  },
} as const;

@Injectable()
export class CheckInsService {
  private readonly logger = new Logger(CheckInsService.name);

  constructor(
    private readonly prisma: DatabaseService,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly auditService: AuditService,
  ) {}

  async getQrToken(gymId: string): Promise<CheckinQrTokenResponse> {
    const cacheKey = `gym-qr-token:${gymId}`;
    let token = await this.redis.get(cacheKey);
    let ttl = 60;

    if (token) {
      const remainingTtl = await this.redis.ttl(cacheKey);
      if (remainingTtl > 5) {
        ttl = remainingTtl;
      } else {
        token = null;
      }
    }

    if (!token) {
      token = randomBytes(16).toString('hex');
      await this.redis.setex(cacheKey, ttl, token);
      await this.redis.setex(`qr-token:${token}`, ttl, gymId);
    }

    const expiresAt = new Date(Date.now() + ttl * 1000);

    return {
      token,
      expiresAt,
    };
  }

  async checkIn(
    gymId: string,
    memberId: string,
    actor: User,
  ): Promise<CheckInResponse> {
    const lockKey = `checkin-lock:${memberId}`;
    const acquired = await this.redis.set(lockKey, '1', 'PX', 5000, 'NX');
    this.logger.log(
      `Lock acquisition for key "${lockKey}": acquired = ${acquired} (${typeof acquired})`,
    );
    if (!acquired) {
      throw new BadRequestException('Check-in is already in progress');
    }

    try {
      const member = await this.prisma.member.findFirst({
        where: { id: memberId, gymId },
        select: { id: true, status: true },
      });

      if (!member) {
        throw new NotFoundException(`Member with ID ${memberId} not found`);
      }

      if (member.status !== 'ACTIVE') {
        throw new BadRequestException('Cannot check in an inactive member');
      }

      const activeCheckIn = await this.prisma.checkIn.findFirst({
        where: { memberId, gymId, checkedOutAt: null },
        select: { id: true },
      });

      if (activeCheckIn) {
        throw new BadRequestException('Member is already checked in');
      }

      const checkIn = await this.prisma.checkIn.create({
        data: {
          gymId,
          memberId,
          checkedInAt: new Date(),
        },
        select: CHECKIN_SELECT,
      });

      this.auditService
        .log({
          gymId,
          userId: actor.id,
          userName: actor.name,
          action: 'checkin.created',
          entityType: 'CheckIn',
          entityId: checkIn.id,
          entityName: `CheckIn ${checkIn.id}`,
        })
        .catch(() => {});

      return checkIn as unknown as CheckInResponse;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  async checkOut(
    id: string,
    gymId: string,
    actor: User,
  ): Promise<CheckInResponse> {
    const checkIn = await this.prisma.checkIn.findFirst({
      where: { id, gymId },
    });

    if (!checkIn) {
      throw new NotFoundException(`Check-in record with ID ${id} not found`);
    }

    if (checkIn.checkedOutAt !== null) {
      throw new BadRequestException('Member is already checked out');
    }

    await this.prisma.checkIn.updateMany({
      where: { id, gymId },
      data: {
        checkedOutAt: new Date(),
      },
    });

    const updated = await this.prisma.checkIn.findFirst({
      where: { id, gymId },
      select: CHECKIN_SELECT,
    });

    this.auditService
      .log({
        gymId,
        userId: actor.id,
        userName: actor.name,
        action: 'checkin.checked-out',
        entityType: 'CheckIn',
        entityId: id,
        entityName: `CheckIn ${id}`,
      })
      .catch(() => {});

    return updated as unknown as CheckInResponse;
  }

  /** Retrieve all check-ins for the gym, sorted by active ones first, then check-in time */
  async getCheckIns(gymId: string): Promise<CheckInListResponse> {
    const checkIns = await this.prisma.checkIn.findMany({
      where: { gymId },
      orderBy: { checkedInAt: 'desc' },
      select: CHECKIN_SELECT,
    });

    const sortedCheckIns = [...checkIns].sort((a, b) => {
      const aActive = a.checkedOutAt === null;
      const bActive = b.checkedOutAt === null;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return (
        new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
      );
    });

    const total = await this.prisma.checkIn.count({
      where: { gymId },
    });

    return {
      checkIns: sortedCheckIns as unknown as CheckInResponse[],
      total,
    };
  }
}
