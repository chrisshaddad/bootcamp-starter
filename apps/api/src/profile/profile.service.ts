import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type { ProfileResponse, ProfileUpdateRequest } from '@repo/contracts';

const userInclude = { profile: true } satisfies Prisma.UserInclude;
type UserWithProfile = Prisma.UserGetPayload<{ include: typeof userInclude }>;

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller's own account + profile. */
  async get(userId: string): Promise<ProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userInclude,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  /**
   * Update the caller's own account (`name` on User) and profile (upserted on
   * UserProfile). Undefined keys are left unchanged (Prisma ignores them).
   */
  async update(
    userId: string,
    data: ProfileUpdateRequest,
  ): Promise<ProfileResponse> {
    const { name, dateOfBirth, ...rest } = data;

    // dateOfBirth arrives as a yyyy-mm-dd string (or ''/null to clear).
    const profileFields = {
      ...rest,
      ...(dateOfBirth !== undefined
        ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
        : {}),
    };

    await this.prisma.$transaction(async (tx) => {
      if (name !== undefined) {
        await tx.user.update({ where: { id: userId }, data: { name } });
      }

      await tx.userProfile.upsert({
        where: { userId },
        create: { userId, ...profileFields },
        update: profileFields,
      });
    });

    return this.get(userId);
  }

  private toResponse(user: UserWithProfile): ProfileResponse {
    const p = user.profile;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: p?.phoneNumber ?? null,
      bio: p?.bio ?? null,
      dateOfBirth: p?.dateOfBirth ?? null,
      street1: p?.street1 ?? null,
      street2: p?.street2 ?? null,
      city: p?.city ?? null,
      state: p?.state ?? null,
      postalCode: p?.postalCode ?? null,
      country: p?.country ?? null,
      profilePictureUrl: p?.profilePictureUrl ?? null,
    };
  }
}
