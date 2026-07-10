import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { User, UserRole } from '@repo/db';
import type {
  UserCreateRequest,
  UserListQuery,
  UserListResponse,
  UserResponse,
  UserUpdateRequest,
} from '@repo/contracts';
import { isPharmacyScopedRole } from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  type AuditChanges,
} from '../audit/audit.constants';

// Statuses that block authentication (see AGENTS.md). We refuse to let an
// admin put these on their own account, which would lock them out.
const AUTH_BLOCKING_STATUSES = ['SUSPENDED', 'INACTIVE'] as const;

// Columns that make up a `UserResponse` on the wire.
const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  pharmacyId: true,
  branchId: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Platform-wide user listing for the super-admin console.
   *
   * `User` is a tenant-scoped model, but this read is intentionally
   * cross-tenant: the caller is restricted to `SUPER_ADMIN` at the controller
   * (see `@Roles('SUPER_ADMIN')`), whose job is to manage every tenant. The
   * only user excluded is the caller themselves — they manage their own account
   * from the profile page — so other super admins still appear in the list.
   */
  async list(
    filters: UserListQuery,
    actorId: string,
  ): Promise<UserListResponse> {
    const where: Prisma.UserWhereInput = {
      AND: [
        { id: { not: actorId } },
        ...(filters.role ? [{ role: filters.role }] : []),
        ...(filters.status ? [{ status: filters.status }] : []),
      ],
    };

    const users = await this.prisma.user.findMany({
      where,
      // `id` is a deterministic tie-breaker so rows keep a stable position when
      // one is updated (createdAt ties would otherwise reorder on write).
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        ...USER_SELECT,
        createdAt: true,
        pharmacy: { select: { name: true } },
      },
    });

    return {
      total: users.length,
      users: users.map(({ pharmacy, ...user }) => ({
        ...user,
        pharmacyName: pharmacy?.name ?? null,
      })),
    };
  }

  /**
   * Resolve the pharmacy a user should be attached to for a given role.
   * Pharmacy-scoped roles require an existing pharmacy; everyone else is
   * detached (null), so a role change can never leave a stale pharmacy link.
   */
  private async resolvePharmacyId(
    role: UserRole,
    pharmacyId: string | null,
  ): Promise<string | null> {
    if (!isPharmacyScopedRole(role)) {
      return null;
    }
    if (!pharmacyId) {
      throw new BadRequestException('Select a pharmacy for this role.');
    }
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { id: true },
    });
    if (!pharmacy) {
      throw new BadRequestException('Selected pharmacy not found.');
    }
    return pharmacyId;
  }

  /**
   * Create a user. The account has no password — the user completes onboarding
   * through the magic-link / set-password flow, same as seeded accounts.
   */
  async create(dto: UserCreateRequest, actorId: string): Promise<UserResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const pharmacyId = await this.resolvePharmacyId(
      dto.role,
      dto.pharmacyId ?? null,
    );

    try {
      const created = await this.prisma.user.create({
        data: { ...dto, pharmacyId, branchId: null, password: null },
        select: USER_SELECT,
      });

      await this.audit.record({
        userId: actorId,
        action: AUDIT_ACTIONS.USER_CREATE,
        entity: AUDIT_ENTITIES.USER,
        entityId: created.id,
        details: {
          email: created.email,
          role: created.role,
          status: created.status,
          pharmacyId: created.pharmacyId,
        },
      });

      return created;
    } catch (error) {
      // A concurrent create for the same email can win the race between the
      // findUnique above and this insert, raising a unique-constraint
      // violation. Map it to the same ConflictException as the pre-check.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists.');
      }
      throw error;
    }
  }

  /**
   * Update a user's role and/or status. Super-admin only (enforced at the
   * controller). Cross-tenant on purpose, same as `list`.
   */
  async update(
    id: string,
    dto: UserUpdateRequest,
    actor: User,
  ): Promise<UserResponse> {
    const isSelf = id === actor.id;

    if (isSelf && dto.role && dto.role !== actor.role) {
      throw new BadRequestException('You cannot change your own role.');
    }

    if (
      isSelf &&
      dto.status &&
      AUTH_BLOCKING_STATUSES.includes(
        dto.status as (typeof AUTH_BLOCKING_STATUSES)[number],
      )
    ) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    const existing = await this.prisma.user.findFirst({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    const data: Prisma.UserUncheckedUpdateInput = {};
    if (dto.status) data.status = dto.status;
    if (dto.role) data.role = dto.role;

    // Re-resolve the pharmacy whenever the role or pharmacy could change, so the
    // link always matches the final role (and clears when it becomes non-scoped).
    const roleChanging = dto.role !== undefined && dto.role !== existing.role;
    if (roleChanging || dto.pharmacyId !== undefined) {
      const finalRole = dto.role ?? existing.role;
      const candidate =
        dto.pharmacyId !== undefined ? dto.pharmacyId : existing.pharmacyId;
      data.pharmacyId = await this.resolvePharmacyId(
        finalRole,
        candidate ?? null,
      );
      data.branchId = null;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT,
    });

    // Build a before → after diff of only the fields that actually changed.
    const changes: AuditChanges = {};
    if (dto.role && dto.role !== existing.role) {
      changes.role = { from: existing.role, to: dto.role };
    }
    if (dto.status && dto.status !== existing.status) {
      changes.status = { from: existing.status, to: dto.status };
    }
    const finalPharmacyId =
      data.pharmacyId !== undefined
        ? (data.pharmacyId as string | null)
        : existing.pharmacyId;
    if (finalPharmacyId !== existing.pharmacyId) {
      // Resolve to names so the diff reads "Acme → Globex", not raw UUIDs.
      changes.pharmacy = {
        from: await this.pharmacyName(existing.pharmacyId),
        to: await this.pharmacyName(finalPharmacyId),
      };
    }

    await this.audit.record({
      userId: actor.id,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entity: AUDIT_ENTITIES.USER,
      entityId: id,
      details: { changes },
    });

    return updated;
  }

  /** Resolve a pharmacy's name for human-readable audit diffs. */
  private async pharmacyName(id: string | null): Promise<string | null> {
    if (!id) return null;
    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id },
      select: { name: true },
    });
    return pharmacy?.name ?? id;
  }

  /** Permanently delete a user. The caller can never delete their own account. */
  async remove(id: string, actor: User): Promise<UserResponse> {
    if (id === actor.id) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const existing = await this.prisma.user.findFirst({
      where: { id },
      select: USER_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('User not found.');
    }

    await this.prisma.user.delete({ where: { id } });

    await this.audit.record({
      userId: actor.id,
      action: AUDIT_ACTIONS.USER_DELETE,
      entity: AUDIT_ENTITIES.USER,
      entityId: id,
      details: { email: existing.email, role: existing.role },
    });

    return existing;
  }
}
