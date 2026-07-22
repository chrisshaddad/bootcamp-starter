import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/prisma.service';
import { CandidateStatus, Prisma } from '@repo/db';

@Injectable()
export class SavedCandidatesService {
  constructor(private readonly db: DatabaseService) {}

  async saveCandidate(userId: string, candidateId: string, note?: string) {
    if (userId === candidateId)
      throw new ConflictException('Cannot save yourself.');

    const candidate = await this.db.user.findUnique({
      where: { id: candidateId },
    });
    if (!candidate) throw new NotFoundException('Candidate not found.');

    try {
      return await this.db.savedCandidate.create({
        data: { savedByUserId: userId, candidateId, note },
        include: { candidate: { include: { developerProfile: true } } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Candidate is already saved.');
      }
      throw error;
    }
  }

  async unsaveCandidate(userId: string, candidateId: string) {
    await this.db.savedCandidate.deleteMany({
      where: { savedByUserId: userId, candidateId },
    });
  }

  async updateCandidate(
    userId: string,
    candidateId: string,
    status?: CandidateStatus,
    note?: string | null,
  ) {
    try {
      return await this.db.savedCandidate.update({
        where: {
          savedByUserId_candidateId: { savedByUserId: userId, candidateId },
        },
        data: {
          ...(status && { status }),
          ...(note !== undefined && { note }),
        },
        include: { candidate: { include: { developerProfile: true } } },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Saved candidate not found.');
      }
      throw error;
    }
  }

  async listSavedCandidates(userId: string) {
    return this.db.savedCandidate.findMany({
      where: { savedByUserId: userId },
      orderBy: { createdAt: 'desc' },
      include: { candidate: { include: { developerProfile: true } } },
    });
  }
}
