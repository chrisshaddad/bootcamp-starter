import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from '../auth/auth.service';
import { SessionService } from '../auth/session.service';
import { PLATFORM_INSTITUTION_ID, Prisma } from '@repo/db';
import type {
  InstitutionListQuery,
  InstitutionListResponse,
  InstitutionDetailResponse,
  InstitutionCreateRequest,
  InstitutionUpdateRequest,
  InstitutionAdminCreateRequest,
} from '@repo/contracts';

@Injectable()
export class InstitutionsService {
  private readonly logger = new Logger(InstitutionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  private readonly detailSelect = {
    id: true,
    name: true,
    type: true,
    status: true,
    address: true,
    phone: true,
    logoUrl: true,
    emailNotifications: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { users: true } },
  } as const;

  // Super-Admin-only view: also surfaces the institution's admin(s) so a
  // botched email from institution set-up can be found and fixed. Not used
  // by findMine/updateMine — Staff/Professional/Patient calling "my
  // institution" have no business seeing another admin's email.
  private readonly adminListSelect = {
    where: { role: 'INSTITUTION_ADMIN' as const },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      isConfirmed: true,
    },
    orderBy: { createdAt: 'asc' as const },
  } as const;

  /**
   * Get all institutions with optional status filter
   */
  async findAll(query: InstitutionListQuery): Promise<InstitutionListResponse> {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;

    // The platform institution is internal bookkeeping (see PLATFORM_INSTITUTION_ID),
    // never a real tenant — exclude it from management views entirely.
    const where = {
      id: { not: PLATFORM_INSTITUTION_ID },
      ...(status ? { status } : {}),
    };

    const [institutions, total] = await Promise.all([
      this.prisma.institution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          address: true,
          createdAt: true,
          _count: { select: { users: true } },
        },
      }),
      this.prisma.institution.count({ where }),
    ]);

    return { institutions, total };
  }

  /**
   * Get a single institution by ID with full details
   */
  async findOne(id: string): Promise<InstitutionDetailResponse> {
    if (id === PLATFORM_INSTITUTION_ID) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }

    const institution = await this.prisma.institution.findUnique({
      where: { id },
      select: { ...this.detailSelect, users: this.adminListSelect },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }

    const { users, ...rest } = institution;
    return { ...rest, admins: users };
  }

  /**
   * Get the caller's own institution (Institution Admin / Staff / Professional / Patient).
   * Unlike findOne, there is no platform-institution exclusion because the
   * caller's institutionId is always a real tenant.
   */
  async findMine(institutionId: string): Promise<InstitutionDetailResponse> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: this.detailSelect,
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    return institution;
  }

  /**
   * Update the caller's own institution profile (Institution Admin only).
   */
  async updateMine(
    institutionId: string,
    data: InstitutionUpdateRequest,
  ): Promise<InstitutionDetailResponse> {
    await this.prisma.institution.update({
      where: { id: institutionId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.emailNotifications !== undefined
          ? { emailNotifications: data.emailNotifications }
          : {}),
      },
    });

    this.logger.log(`Institution ${institutionId} profile updated`);
    return this.findMine(institutionId);
  }

  /**
   * Create an institution together with its first admin user.
   * An institution with no admin has no one who can log in to manage it.
   */
  async create(
    data: InstitutionCreateRequest,
    createdById: string,
  ): Promise<InstitutionDetailResponse> {
    let institution: { id: string };

    try {
      institution = await this.prisma.$transaction(async (tx) => {
        const created = await tx.institution.create({
          data: {
            name: data.name,
            type: data.type,
            address: data.address ?? null,
          },
        });

        await tx.user.create({
          data: {
            ...data.admin,
            role: 'INSTITUTION_ADMIN',
            institutionId: created.id,
            createdById,
          },
        });

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('email')
      ) {
        this.logger.warn(
          'Institution creation rejected: admin email already in use',
        );
        throw new ConflictException(
          `A user with email ${data.admin.email} already exists`,
        );
      }
      throw error;
    }

    this.logger.log(`Institution ${institution.id} created`);
    return this.findOne(institution.id);
  }

  /**
   * Add another admin to an existing institution (Super Admin only) — for
   * when a second admin is needed, or the institution somehow ended up with
   * none left to log in and fix things themselves.
   */
  async addAdmin(
    institutionId: string,
    data: InstitutionAdminCreateRequest,
    createdById: string,
    inviterName: string,
  ): Promise<InstitutionDetailResponse> {
    await this.ensureExists(institutionId);

    const normalizedEmail = data.email.toLowerCase();
    let createdId: string;

    try {
      const created = await this.prisma.user.create({
        data: {
          fullName: data.fullName,
          email: normalizedEmail,
          phone: data.phone,
          role: 'INSTITUTION_ADMIN',
          institutionId,
          createdById,
        },
      });
      createdId = created.id;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('email')
      ) {
        this.logger.warn(
          `Admin creation rejected for institution ${institutionId}: email already in use`,
        );
        throw new ConflictException(
          `A user with email ${normalizedEmail} already exists`,
        );
      }
      throw error;
    }

    const institution = await this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: { name: true },
    });

    try {
      await this.authService.sendInvitation(
        { id: createdId, email: normalizedEmail },
        inviterName,
        institution.name,
      );
    } catch (error) {
      this.logger.error(
        `Admin ${createdId} created but invitation failed to send`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(`Admin ${createdId} added to institution ${institutionId}`);
    return this.findOne(institutionId);
  }

  /**
   * Fix a typo'd admin email from institution set-up (Super Admin only) —
   * the one recovery path when the founding admin's invite never arrived
   * and they have no way to log in and fix it themselves. Resets the
   * account to unconfirmed and sends a fresh invitation to the corrected
   * address.
   */
  async updateAdminEmail(
    institutionId: string,
    adminId: string,
    email: string,
    inviterName: string,
  ): Promise<InstitutionDetailResponse> {
    await this.ensureExists(institutionId);

    const admin = await this.prisma.user.findFirst({
      where: { id: adminId, institutionId, role: 'INSTITUTION_ADMIN' },
    });

    if (!admin) {
      throw new NotFoundException(`Admin with ID ${adminId} not found`);
    }

    const normalizedEmail = email.toLowerCase();

    try {
      await this.prisma.user.update({
        where: { id: adminId },
        data: { email: normalizedEmail, isConfirmed: false },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target as string[] | undefined)?.includes('email')
      ) {
        this.logger.warn(
          `Admin email update rejected for admin ${adminId}: email already in use`,
        );
        throw new ConflictException(
          `A user with email ${normalizedEmail} already exists`,
        );
      }
      throw error;
    }

    // The corrected email is a new identity for this account — any session
    // opened under the old address must not silently carry over.
    await this.sessionService.deleteAllUserSessions(adminId);

    const institution = await this.prisma.institution.findUniqueOrThrow({
      where: { id: institutionId },
      select: { name: true },
    });

    try {
      await this.authService.sendInvitation(
        { id: adminId, email: normalizedEmail },
        inviterName,
        institution.name,
      );
    } catch (error) {
      this.logger.error(
        `Admin ${adminId} email updated but invitation failed to send`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    this.logger.log(
      `Admin ${adminId} email corrected for institution ${institutionId}`,
    );
    return this.findOne(institutionId);
  }

  /**
   * Approve an institution (set status to ACTIVE) and invite its admin(s) —
   * this is the first point at which their account is actually usable
   * (login is blocked for non-ACTIVE institutions), so this is when the
   * invite should go out, not at creation time.
   */
  async approve(
    id: string,
    inviterName: string,
  ): Promise<InstitutionDetailResponse> {
    await this.ensureExists(id);

    await this.prisma.institution.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    await this.inviteAdmins(id, inviterName);

    this.logger.log(`Institution ${id} approved`);
    return this.findOne(id);
  }

  /**
   * Reject an institution (set status to REJECTED)
   */
  async reject(id: string): Promise<InstitutionDetailResponse> {
    await this.ensureExists(id);

    await this.prisma.institution.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    this.logger.log(`Institution ${id} rejected`);
    return this.findOne(id);
  }

  /**
   * Suspend an institution (set status to SUSPENDED). Enforced at login/auth
   * time — every user of a non-ACTIVE institution is blocked from acting.
   */
  async suspend(id: string): Promise<InstitutionDetailResponse> {
    await this.ensureExists(id);

    await this.prisma.institution.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    this.logger.log(`Institution ${id} suspended`);
    return this.findOne(id);
  }

  /**
   * Reactivate a suspended or rejected institution (set status back to ACTIVE).
   */
  async reactivate(id: string): Promise<InstitutionDetailResponse> {
    await this.ensureExists(id);

    await this.prisma.institution.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Institution ${id} reactivated`);
    return this.findOne(id);
  }

  /**
   * Best-effort: invite every current admin of an institution. Used when an
   * institution transitions to ACTIVE for the first time (approve), so a
   * founding admin who was never sent an invite at creation gets one now.
   */
  private async inviteAdmins(
    institutionId: string,
    inviterName: string,
  ): Promise<void> {
    const [admins, institution] = await Promise.all([
      this.prisma.user.findMany({
        where: { institutionId, role: 'INSTITUTION_ADMIN' },
        select: { id: true, email: true },
      }),
      this.prisma.institution.findUniqueOrThrow({
        where: { id: institutionId },
        select: { name: true },
      }),
    ]);

    for (const admin of admins) {
      try {
        await this.authService.sendInvitation(
          admin,
          inviterName,
          institution.name,
        );
      } catch (error) {
        this.logger.error(
          `Institution ${institutionId} approved but invitation failed to send to admin ${admin.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  private async ensureExists(id: string): Promise<void> {
    if (id === PLATFORM_INSTITUTION_ID) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }

    const existing = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Institution with ID ${id} not found`);
    }
  }
}
