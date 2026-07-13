import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { User } from '@repo/db';
import type {
  BranchCreateRequest,
  BranchListResponse,
  BranchResponse,
  BranchUpdateRequest,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  type AuditChanges,
} from '../audit/audit.constants';

// Columns that make up a `BranchResponse` (userCount derived from the relation).
const BRANCH_SELECT = {
  id: true,
  pharmacyId: true,
  name: true,
  phoneNumber: true,
  address: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  _count: { select: { users: true } },
} satisfies Prisma.PharmacyBranchSelect;

type BranchRow = Prisma.PharmacyBranchGetPayload<{
  select: typeof BRANCH_SELECT;
}>;

// Pharmacy-admin branch management. Mirrors the branch CRUD in
// `pharmacies.service` (the super-admin path), but re-scoped from a URL `:id` to
// the caller's own `actor.pharmacyId` — the tenant boundary always comes from
// the session, never the request.
@Injectable()
export class BranchesService {
  private readonly logger = new Logger(BranchesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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

  /** Map a DB branch row to its wire shape (decimals → plain numbers). */
  private toResponse(branch: BranchRow): BranchResponse {
    return {
      id: branch.id,
      pharmacyId: branch.pharmacyId,
      name: branch.name,
      phoneNumber: branch.phoneNumber,
      address: branch.address,
      latitude: Number(branch.latitude),
      longitude: Number(branch.longitude),
      userCount: branch._count.users,
      createdAt: branch.createdAt,
    };
  }

  /** Every branch in the caller's pharmacy, oldest first (stable ordering). */
  async list(actor: User): Promise<BranchListResponse> {
    const pharmacyId = this.pharmacyIdOf(actor);

    const branches = await this.prisma.pharmacyBranch.findMany({
      where: { pharmacyId },
      // `id` is a deterministic tie-breaker so rows keep a stable position when
      // one is updated (createdAt ties would otherwise reorder on write).
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: BRANCH_SELECT,
    });

    return {
      total: branches.length,
      branches: branches.map((branch) => this.toResponse(branch)),
    };
  }

  /** Add a branch to the caller's pharmacy. */
  async create(dto: BranchCreateRequest, actor: User): Promise<BranchResponse> {
    const pharmacyId = this.pharmacyIdOf(actor);

    const created = await this.prisma.pharmacyBranch.create({
      data: {
        pharmacyId,
        name: dto.name,
        phoneNumber: dto.phoneNumber ?? null,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      },
      select: BRANCH_SELECT,
    });

    await this.audit.record({
      userId: actor.id,
      action: AUDIT_ACTIONS.BRANCH_CREATE,
      entity: AUDIT_ENTITIES.PHARMACY_BRANCH,
      entityId: created.id,
      details: { name: created.name, pharmacyId },
    });

    return this.toResponse(created);
  }

  /** Edit a branch. Scoped to the caller's pharmacy on the read and the write. */
  async update(
    id: string,
    dto: BranchUpdateRequest,
    actor: User,
  ): Promise<BranchResponse> {
    const pharmacyId = this.pharmacyIdOf(actor);

    // Load current values (scoped to the pharmacy, so this also enforces the
    // tenant boundary + existence) to diff against for the audit entry.
    const existing = await this.prisma.pharmacyBranch.findFirst({
      where: { id, pharmacyId },
      select: {
        name: true,
        phoneNumber: true,
        address: true,
        latitude: true,
        longitude: true,
      },
    });
    if (!existing) {
      throw new NotFoundException('Branch not found in your pharmacy.');
    }

    const data: Prisma.PharmacyBranchUncheckedUpdateManyInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;

    // Scope the write by pharmacyId too, so the tenant boundary is enforced on
    // the mutation itself — not just the pre-check above.
    await this.prisma.pharmacyBranch.updateMany({
      where: { id, pharmacyId },
      data,
    });
    // Re-read scoped by pharmacyId. Use findFirst + an explicit guard (not
    // findFirstOrThrow) so a concurrent delete landing between the updateMany
    // and here surfaces as a clean NotFoundException rather than a raw Prisma
    // P2025 (which would leak as an uncaught 500).
    const updated = await this.prisma.pharmacyBranch.findFirst({
      where: { id, pharmacyId },
      select: BRANCH_SELECT,
    });
    if (!updated) {
      throw new NotFoundException('Branch not found in your pharmacy.');
    }

    // Before → after diff of only the fields that actually changed.
    const changes: AuditChanges = {};
    if (dto.name !== undefined && dto.name !== existing.name) {
      changes.name = { from: existing.name, to: dto.name };
    }
    if (
      dto.phoneNumber !== undefined &&
      dto.phoneNumber !== existing.phoneNumber
    ) {
      changes.phoneNumber = { from: existing.phoneNumber, to: dto.phoneNumber };
    }
    if (dto.address !== undefined && dto.address !== existing.address) {
      changes.address = { from: existing.address, to: dto.address };
    }
    if (
      dto.latitude !== undefined &&
      Number(existing.latitude) !== dto.latitude
    ) {
      changes.latitude = { from: Number(existing.latitude), to: dto.latitude };
    }
    if (
      dto.longitude !== undefined &&
      Number(existing.longitude) !== dto.longitude
    ) {
      changes.longitude = {
        from: Number(existing.longitude),
        to: dto.longitude,
      };
    }

    await this.audit.record({
      userId: actor.id,
      action: AUDIT_ACTIONS.BRANCH_UPDATE,
      entity: AUDIT_ENTITIES.PHARMACY_BRANCH,
      entityId: id,
      details: { changes },
    });

    return this.toResponse(updated);
  }

  /**
   * Delete a branch. API-enforced guard: blocked while any user is still
   * assigned to it within the caller's pharmacy (User → Branch is Restrict at
   * the DB anyway) — the admin reassigns those staff first.
   */
  async remove(id: string, actor: User): Promise<{ id: string }> {
    const pharmacyId = this.pharmacyIdOf(actor);

    const branch = await this.prisma.pharmacyBranch.findFirst({
      where: { id, pharmacyId },
      select: { id: true, name: true, _count: { select: { users: true } } },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found in your pharmacy.');
    }
    if (branch._count.users > 0) {
      throw new ConflictException(
        'Reassign this branch’s staff before deleting it.',
      );
    }

    // Scope the delete by pharmacyId too, keeping the tenant boundary on the
    // write itself (not just the findFirst check above).
    try {
      await this.prisma.pharmacyBranch.deleteMany({
        where: { id, pharmacyId },
      });
    } catch (error) {
      // Close the check-then-act gap: if a user is assigned to this branch
      // between the _count check above and here, User → Branch is Restrict at
      // the DB, so the delete raises a P2003 foreign-key error. Map it to the
      // same 409 the pre-check throws, keeping the API contract (Nest
      // exceptions only) intact instead of leaking a raw Prisma 500.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Reassign this branch’s staff before deleting it.',
        );
      }
      // Anything else is unexpected — surface it in the logs before re-throwing
      // so the failure is observable, then let the global filter handle it.
      this.logger.error(
        `Failed to delete branch ${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }

    await this.audit.record({
      userId: actor.id,
      action: AUDIT_ACTIONS.BRANCH_DELETE,
      entity: AUDIT_ENTITIES.PHARMACY_BRANCH,
      entityId: id,
      details: { name: branch.name, pharmacyId },
    });

    return { id };
  }
}
