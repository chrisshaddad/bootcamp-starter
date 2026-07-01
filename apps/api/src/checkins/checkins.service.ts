import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import type { CheckInResponse, CheckInListResponse } from '@repo/contracts';

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

  constructor(private readonly prisma: DatabaseService) {}

  async checkIn(gymId: string, memberId: string): Promise<CheckInResponse> {
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

    return checkIn as unknown as CheckInResponse;
  }

  async checkOut(id: string, gymId: string): Promise<CheckInResponse> {
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
