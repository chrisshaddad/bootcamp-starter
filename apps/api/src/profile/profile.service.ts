import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { ProfileResponse, ProfileUpdateRequest } from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  type AuditChanges,
} from '../audit/audit.constants';

// Columns that make up a `ProfileResponse` on the wire.
const PROFILE_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  dateOfBirth: true,
  address: true,
  latitude: true,
  longitude: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

type ProfileRow = Prisma.UserGetPayload<{ select: typeof PROFILE_SELECT }>;

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** The signed-in user's own profile. */
  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return this.toResponse(user);
  }

  /**
   * Update the signed-in user's own editable details. Self-scoped — the id comes
   * from the session (`@CurrentUser`), never the request body, so a user can only
   * ever edit their own profile. Records a before → after audit diff.
   */
  async updateProfile(
    userId: string,
    dto: ProfileUpdateRequest,
  ): Promise<ProfileResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
        // Prisma stores dateOfBirth as a @db.Date; a 'YYYY-MM-DD' string maps to
        // midnight UTC, which round-trips back to the same day.
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      select: PROFILE_SELECT,
    });

    const before = this.toResponse(existing);
    const after = this.toResponse(updated);
    const changes: AuditChanges = {};
    const fields = [
      'firstName',
      'lastName',
      'phoneNumber',
      'dateOfBirth',
      'address',
      'latitude',
      'longitude',
    ] as const;
    for (const field of fields) {
      if (before[field] !== after[field]) {
        changes[field] = { from: before[field], to: after[field] };
      }
    }

    await this.audit.record({
      userId,
      action: AUDIT_ACTIONS.PROFILE_UPDATE,
      entity: AUDIT_ENTITIES.USER,
      entityId: userId,
      details: { changes },
    });

    return after;
  }

  // Map a DB row to the wire shape: decimals → plain numbers, dateOfBirth → a
  // 'YYYY-MM-DD' string (stable for diffing and clean on the wire).
  private toResponse(user: ProfileRow): ProfileResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      dateOfBirth: user.dateOfBirth
        ? user.dateOfBirth.toISOString().slice(0, 10)
        : null,
      address: user.address,
      latitude: user.latitude === null ? null : Number(user.latitude),
      longitude: user.longitude === null ? null : Number(user.longitude),
      role: user.role,
      status: user.status,
    };
  }
}
