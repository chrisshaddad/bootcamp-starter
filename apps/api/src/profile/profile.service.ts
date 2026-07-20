import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { User } from '@repo/db';
import type {
  SelfProfileResponse,
  SelfProfileUpdateRequest,
} from '@repo/contracts';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async buildResponse(userId: string): Promise<SelfProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        institution: { select: { name: true } },
        professionalProfile: { select: { specialty: true, bio: true } },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      institutionName: user.institution.name,
      specialty: user.professionalProfile?.specialty ?? null,
      bio: user.professionalProfile?.bio ?? null,
    };
  }

  async getMine(actor: User): Promise<SelfProfileResponse> {
    return this.buildResponse(actor.id);
  }

  async updateMine(
    actor: User,
    data: SelfProfileUpdateRequest,
  ): Promise<SelfProfileResponse> {
    await this.prisma.$transaction(async (tx) => {
      if (data.fullName !== undefined || data.phone !== undefined) {
        await tx.user.update({
          where: { id: actor.id },
          data: {
            ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
            ...(data.phone !== undefined ? { phone: data.phone } : {}),
          },
        });
      }

      // Only a Professional has a bio to update; silently ignored for
      // every other role rather than erroring, since the same client
      // form only shows the field when it's relevant.
      if (actor.role === 'PROFESSIONAL' && data.bio !== undefined) {
        await tx.professionalProfile.update({
          where: { userId: actor.id },
          data: { bio: data.bio },
        });
      }
    });

    this.logger.log(`Profile updated by ${actor.id}`);
    return this.buildResponse(actor.id);
  }
}
