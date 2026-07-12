import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, randomBytes } from 'crypto';
import { Prisma } from '@repo/db';
import type { User } from '@repo/db';
import type {
  EmployeeBranchOptionsResponse,
  EmployeeInviteRequest,
  EmployeeListQuery,
  EmployeeListResponse,
  EmployeeResponse,
  EmployeeRole,
  EmployeeUpdateRequest,
} from '@repo/contracts';
import { employeeRoleSchema } from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  type AuditChanges,
} from '../audit/audit.constants';
import { MAIL_QUEUE, MAIL_JOBS } from '../mail/mail.constants';

// The roles a pharmacy admin manages — derived from the contract enum so it can
// never drift out of sync. The admin themselves (PHARMACY_ADMIN) is not in this
// subset, so they never appear in the employees list or become an update target.
const EMPLOYEE_ROLES = employeeRoleSchema.options;

// Invite links live longer than sign-in links: new staff may not act right away.
const INVITE_EXPIRY_DAYS = 7;

// Columns that make up an `EmployeeResponse` (branch resolved to its name).
const EMPLOYEE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  status: true,
  branchId: true,
  createdAt: true,
  branch: { select: { name: true } },
} satisfies Prisma.UserSelect;

type EmployeeRow = Prisma.UserGetPayload<{ select: typeof EMPLOYEE_SELECT }>;

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
  ) {}

  // A PHARMACY_ADMIN always carries a pharmacyId, but guard anyway so a
  // mis-scoped account can never fall through to an unscoped query.
  private pharmacyIdOf(actor: User): string {
    if (!actor.pharmacyId) {
      throw new ForbiddenException(
        'Your account is not attached to a pharmacy.',
      );
    }
    return actor.pharmacyId;
  }

  private toResponse(row: EmployeeRow): EmployeeResponse {
    const { branch, ...rest } = row;
    return {
      ...rest,
      // Rows are always fetched with a role ∈ EMPLOYEE_ROLES, so the widening
      // from the DB's UserRole down to EmployeeRole is safe.
      role: rest.role as EmployeeRole,
      branchName: branch?.name ?? null,
    };
  }

  /** Every staff member in the caller's pharmacy, newest first. */
  async list(
    query: EmployeeListQuery,
    actor: User,
  ): Promise<EmployeeListResponse> {
    const pharmacyId = this.pharmacyIdOf(actor);

    const employees = await this.prisma.user.findMany({
      where: {
        pharmacyId,
        // A specific role filter still stays within the managed set; with no
        // filter, list all four employee roles (never the admin themselves).
        role: query.role ? query.role : { in: [...EMPLOYEE_ROLES] },
        ...(query.status ? { status: query.status } : {}),
        ...(query.branchId ? { branchId: query.branchId } : {}),
      },
      // `id` is a deterministic tie-breaker so rows keep a stable position when
      // one is updated (createdAt ties would otherwise reorder on write).
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: EMPLOYEE_SELECT,
    });

    return {
      total: employees.length,
      employees: employees.map((employee) => this.toResponse(employee)),
    };
  }

  /** Lightweight branch list for the invite / reassign dropdowns. */
  async branchOptions(actor: User): Promise<EmployeeBranchOptionsResponse> {
    const pharmacyId = this.pharmacyIdOf(actor);

    return this.prisma.pharmacyBranch.findMany({
      where: { pharmacyId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  /**
   * Invite a staff member: create a PENDING account (no password) attached to
   * the caller's pharmacy + chosen branch, then email them a magic link to
   * onboard. The pharmacy is taken from the caller, never the request body.
   */
  async invite(
    dto: EmployeeInviteRequest,
    actor: User,
  ): Promise<EmployeeResponse> {
    const pharmacyId = this.pharmacyIdOf(actor);
    // Normalize like every other creation path — the unique index is
    // case-sensitive and logins lowercase first, so a verbatim email would
    // lock the user out permanently.
    const email = dto.email.toLowerCase().trim();

    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    // The branch must belong to the caller's pharmacy — never trust the body.
    const branch = await this.prisma.pharmacyBranch.findFirst({
      where: { id: dto.branchId, pharmacyId },
      select: { id: true },
    });
    if (!branch) {
      throw new BadRequestException(
        'Selected branch does not belong to your pharmacy.',
      );
    }

    let created: EmployeeRow;
    try {
      created = await this.prisma.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email,
          role: dto.role,
          status: 'PENDING',
          pharmacyId,
          branchId: dto.branchId,
          password: null,
        },
        select: EMPLOYEE_SELECT,
      });
    } catch (error) {
      // A concurrent insert for the same email can win the race between the
      // findUnique above and this create. Map it to the same 409.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists.');
      }
      throw error;
    }

    // The account is already committed. A queue/Redis failure here must not
    // bubble up as a 500 that leaves an orphaned PENDING user the admin believes
    // failed — log it so the failure is visible, and let the create succeed (the
    // admin can re-issue the invite). The SEND_INVITATION job is consumed by
    // MailProcessor.handleSendInvitation.
    try {
      await this.sendInvite(created, actor, pharmacyId);
    } catch (error) {
      this.logger.error(
        `Employee ${created.id} was created but the invite email could not be queued.`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    await this.audit.record({
      userId: actor.id,
      action: AUDIT_ACTIONS.USER_CREATE,
      entity: AUDIT_ENTITIES.USER,
      entityId: created.id,
      details: {
        email: created.email,
        role: created.role,
        branchId: created.branchId,
      },
    });

    return this.toResponse(created);
  }

  /**
   * Change an employee's role, branch, and/or status. Scoped to the caller's
   * pharmacy and to the managed roles, so an admin can never touch another
   * pharmacy's staff or another admin's account.
   */
  async update(
    id: string,
    dto: EmployeeUpdateRequest,
    actor: User,
  ): Promise<EmployeeResponse> {
    const pharmacyId = this.pharmacyIdOf(actor);

    const existing = await this.prisma.user.findFirst({
      where: { id, pharmacyId, role: { in: [...EMPLOYEE_ROLES] } },
      select: EMPLOYEE_SELECT,
    });
    if (!existing) {
      throw new NotFoundException('Employee not found in your pharmacy.');
    }

    const data: Prisma.UserUncheckedUpdateInput = {};
    if (dto.role) data.role = dto.role;
    if (dto.status) {
      // PENDING is set only by the invite flow (onboarding not yet complete).
      // Re-assert that server-side so a direct API call can't revert an active
      // employee back to PENDING — the web UI already excludes it as a choice.
      if (dto.status === 'PENDING') {
        throw new BadRequestException(
          'PENDING is managed by the invite flow and cannot be set manually.',
        );
      }
      data.status = dto.status;
    }

    if (dto.branchId !== undefined) {
      const branch = await this.prisma.pharmacyBranch.findFirst({
        where: { id: dto.branchId, pharmacyId },
        select: { id: true },
      });
      if (!branch) {
        throw new BadRequestException(
          'Selected branch does not belong to your pharmacy.',
        );
      }
      data.branchId = dto.branchId;
    }

    // Scope the write by pharmacyId too, so the tenant boundary is enforced on
    // the mutation itself — not just the findFirst check above.
    await this.prisma.user.updateMany({ where: { id, pharmacyId }, data });
    const updated = await this.prisma.user.findFirstOrThrow({
      where: { id, pharmacyId },
      select: EMPLOYEE_SELECT,
    });

    // Build a before → after diff of only the fields that actually changed.
    const changes: AuditChanges = {};
    if (dto.role && dto.role !== existing.role) {
      changes.role = { from: existing.role, to: dto.role };
    }
    if (dto.status && dto.status !== existing.status) {
      changes.status = { from: existing.status, to: dto.status };
    }
    if (dto.branchId !== undefined && dto.branchId !== existing.branchId) {
      // Resolve to names so the diff reads "Downtown → Airport", not UUIDs.
      const [fromName, toName] = await Promise.all([
        this.branchName(existing.branchId, pharmacyId),
        this.branchName(updated.branchId, pharmacyId),
      ]);
      changes.branch = { from: fromName, to: toName };
    }

    await this.audit.record({
      userId: actor.id,
      action: AUDIT_ACTIONS.USER_UPDATE,
      entity: AUDIT_ENTITIES.USER,
      entityId: id,
      details: { changes },
    });

    return this.toResponse(updated);
  }

  /**
   * Mint a single-use magic link and email it as an invite. Mirrors the token
   * mechanics of AuthService.issueMagicLink (SHA-256-hashed, prior links
   * invalidated) but sends the invitation template with a longer expiry.
   */
  private async sendInvite(
    user: EmployeeRow,
    actor: User,
    pharmacyId: string,
  ): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );

    // Invalidate any still-valid links for this user before issuing a new one.
    await this.prisma.magicLink.updateMany({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    await this.prisma.magicLink.create({
      data: { userId: user.id, token: tokenHash, expiresAt },
    });

    const pharmacy = await this.prisma.pharmacy.findUnique({
      where: { id: pharmacyId },
      select: { name: true },
    });
    const invitationLink = `${process.env.APP_URL}/auth/verify?token=${rawToken}`;

    await this.mailQueue.add(MAIL_JOBS.SEND_INVITATION, {
      email: user.email,
      inviterName: `${actor.firstName} ${actor.lastName}`.trim(),
      organizationName: pharmacy?.name ?? 'your pharmacy',
      invitationLink,
    });
  }

  /**
   * Resolve a branch's name for human-readable audit diffs. Scoped by
   * pharmacyId — like every other query in this file — so the helper upholds
   * tenant isolation and stays safe if reused for a caller-supplied id.
   */
  private async branchName(
    id: string | null,
    pharmacyId: string,
  ): Promise<string | null> {
    if (!id) return null;
    const branch = await this.prisma.pharmacyBranch.findFirst({
      where: { id, pharmacyId },
      select: { name: true },
    });
    return branch?.name ?? id;
  }
}
