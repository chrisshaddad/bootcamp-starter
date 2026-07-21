import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';
import { Role } from '@/common/enums';
import { LeaseResponse, LeaseListRow } from '@repo/contracts';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { RenewLeaseDto } from './dto/renew-lease.dto';
import { formatLease } from './lease-formatter';

const OCCUPYING_STATUSES = new Set(['occupied']);

@Injectable()
export class LeasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly notifications: NotificationsService,
    private readonly buildingAccess: BuildingAccessService,
    private readonly leaseStatus: LeaseStatusService,
  ) {}

  // ── Format helpers ────────────────────────────────────────────────────────

  private formatLease(lease: Parameters<typeof formatLease>[0]): LeaseResponse {
    return formatLease(lease, new Date(), this.leaseStatus);
  }

  private async assertApartmentInScope(
    orgId: string,
    buildingId: string,
    floorId: string,
    apartmentId: string,
  ): Promise<{ id: string; status: string }> {
    const apartment = await this.prisma.apartment.findFirst({
      where: { id: apartmentId, orgId, buildingId, floorId },
      select: { id: true, status: true },
    });
    if (!apartment) throw new NotFoundException('Apartment not found.');
    return apartment;
  }

  private async assertRenterInOrg(
    orgId: string,
    renterId: string,
  ): Promise<{ id: string; renterUserId: string | null }> {
    const renter = await this.prisma.renter.findFirst({
      where: { id: renterId, orgId },
      select: { id: true, renterUserId: true },
    });
    if (!renter) throw new NotFoundException('Renter not found.');
    return renter;
  }

  /**
   * Server-side invariant: a lease must end strictly after it starts. The FE
   * enforces this too, but a direct API call previously bypassed it (the DTO
   * only validated each date in isolation), so a lease with endDate <= startDate
   * could be persisted.
   */
  private assertValidDateRange(
    startDate: string | Date,
    endDate: string | Date,
  ): void {
    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      throw new BadRequestException('Invalid lease start or end date.');
    }
    if (endMs <= startMs) {
      throw new BadRequestException(
        'Lease end date must be after the start date.',
      );
    }
  }

  /** UTC midnight for `date` — the F4.3 start-date policy compares at day granularity. */
  private startOfUtcDay(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  /**
   * F4.1: true date-range overlap check, replacing the old "any effectively-
   * active lease on the apartment" rule (which ignored the new lease's own
   * dates and made back-to-back/future leases impossible). Rejects only if
   * `[startDate, endDate)` overlaps an existing NON-terminated lease's own
   * `[startDate, endDate)` on the same apartment — end-exclusive, so
   * back-to-back leases (newStart === existingEnd) are allowed. Terminated
   * leases are filtered out in application code (matching the sibling
   * WorkOrderApartmentStatusService convention of querying broadly and
   * filtering status in JS) so a stale mock/row can't silently bypass this in
   * tests. `excludeLeaseId` lets update() exclude its own row.
   */
  private async assertNoOverlappingLease(
    apartmentId: string,
    startDate: Date,
    endDate: Date,
    excludeLeaseId?: string,
  ): Promise<void> {
    const existingLeases = await this.prisma.lease.findMany({
      where: {
        apartmentId,
        ...(excludeLeaseId && { id: { not: excludeLeaseId } }),
      },
      select: { status: true, startDate: true, endDate: true },
    });

    const overlaps = existingLeases.some(
      (l) =>
        l.status !== 'terminated' &&
        startDate < l.endDate &&
        l.startDate < endDate,
    );
    if (overlaps) {
      throw new ConflictException(
        'This apartment already has a lease that overlaps these dates.',
      );
    }
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
    buildingId: string,
    floorId: string,
    apartmentId: string,
  ): Promise<{ data: LeaseResponse[] }> {
    await this.buildingAccess.assertBuildingAccess(
      orgId,
      callerId,
      callerRole,
      buildingId,
    );

    const leases = await this.prisma.lease.findMany({
      where: { orgId, buildingId, floorId, apartmentId },
      orderBy: { startDate: 'desc' },
    });

    return { data: leases.map((l) => this.formatLease(l)) };
  }

  /**
   * Org-wide, flat leases list (Sprint U1) — used by the top-level
   * /dashboard/leases page. Access is scoped the same way as the nested
   * read path: org_admin/finance see all org leases, supervisor/maintenance
   * are constrained to their assigned buildings. Each row is enriched with
   * display names (building/floor/unit/renter); missing relations fall back
   * to '' rather than throwing.
   */
  async findAllForOrg(
    orgId: string,
    callerId: string,
    callerRole: Role,
  ): Promise<{ data: LeaseListRow[] }> {
    const allowedBuildingIds = await this.buildingAccess.getAllowedBuildingIds(
      orgId,
      callerId,
      callerRole,
    );

    const leases = await this.prisma.lease.findMany({
      where: {
        orgId,
        ...(allowedBuildingIds
          ? { buildingId: { in: allowedBuildingIds } }
          : {}),
      },
      orderBy: { startDate: 'desc' },
    });

    const buildingIds = [...new Set(leases.map((l) => l.buildingId))];
    const floorIds = [...new Set(leases.map((l) => l.floorId))];
    const apartmentIds = [...new Set(leases.map((l) => l.apartmentId))];
    const renterIds = [...new Set(leases.map((l) => l.renterId))];

    const [buildings, floors, apartments, renters] = await Promise.all([
      this.prisma.building.findMany({
        where: { id: { in: buildingIds }, orgId },
        select: { id: true, name: true },
      }),
      this.prisma.floor.findMany({
        where: { id: { in: floorIds }, orgId },
        select: { id: true, name: true },
      }),
      this.prisma.apartment.findMany({
        where: { id: { in: apartmentIds }, orgId },
        select: { id: true, unitNumber: true },
      }),
      this.prisma.renter.findMany({
        where: { id: { in: renterIds }, orgId },
        select: { id: true, fullName: true },
      }),
    ]);

    const buildingNameById = new Map(buildings.map((b) => [b.id, b.name]));
    const floorNameById = new Map(floors.map((f) => [f.id, f.name]));
    const unitNumberById = new Map(
      apartments.map((a) => [a.id, a.unitNumber]),
    );
    const renterNameById = new Map(renters.map((r) => [r.id, r.fullName]));

    return {
      data: leases.map((lease) => ({
        ...this.formatLease(lease),
        buildingName: buildingNameById.get(lease.buildingId) ?? '',
        floorName: floorNameById.get(lease.floorId) ?? '',
        unitNumber: unitNumberById.get(lease.apartmentId) ?? '',
        renterName: renterNameById.get(lease.renterId) ?? '',
      })),
    };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    buildingId: string,
    floorId: string,
    apartmentId: string,
    leaseId: string,
  ): Promise<{ data: LeaseResponse }> {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, orgId, buildingId, floorId, apartmentId },
    });
    if (!lease) throw new NotFoundException('Lease not found.');

    await this.buildingAccess.assertBuildingAccess(
      orgId,
      callerId,
      callerRole,
      buildingId,
    );

    return { data: this.formatLease(lease) };
  }

  async create(
    orgId: string,
    actorId: string,
    buildingId: string,
    floorId: string,
    apartmentId: string,
    dto: CreateLeaseDto,
  ): Promise<{ data: LeaseResponse }> {
    await this.assertApartmentInScope(orgId, buildingId, floorId, apartmentId);
    const renter = await this.assertRenterInOrg(orgId, dto.renterId);

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    this.assertValidDateRange(startDate, endDate);

    const resolvedStatus = dto.status ?? 'active';
    const now = new Date();

    // F4.3 (decision D3): a new ACTIVE lease can't silently start in the
    // past — that almost always means the caller meant to back-date an
    // already-existing lease, which must be explicit via recordExisting.
    if (
      resolvedStatus === 'active' &&
      this.startOfUtcDay(startDate) < this.startOfUtcDay(now) &&
      !dto.recordExisting
    ) {
      throw new BadRequestException(
        "A new active lease can't start in the past; use 'record an existing lease' to back-date.",
      );
    }

    // F4.1: reject only on a genuine date-range overlap with another
    // non-terminated lease on this apartment — not simply "an active lease
    // exists" (that made future/back-to-back leases impossible).
    if (resolvedStatus !== 'terminated') {
      await this.assertNoOverlappingLease(apartmentId, startDate, endDate);
    }

    const lease = await this.prisma.$transaction(async (tx) => {
      const lease = await tx.lease.create({
        data: {
          orgId,
          buildingId,
          floorId,
          apartmentId,
          renterId: dto.renterId,
          startDate,
          endDate,
          rentAmount: dto.rentAmount,
          depositAmount: dto.depositAmount,
          status: resolvedStatus,
          renewalTerms: dto.renewalTerms,
          notes: dto.notes,
        },
      });

      if (resolvedStatus === 'active') {
        await tx.apartment.update({
          where: { id: apartmentId },
          data: { status: 'occupied' },
        });
      }

      return lease;
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'lease.created',
      targetType: 'Lease',
      targetId: lease.id,
      metadata: { apartmentId, renterId: dto.renterId },
    });

    // F5.1: notify the tenant — skip silently if the renter has no linked
    // portal user.
    if (renter.renterUserId) {
      await this.notifications.enqueue({
        orgId,
        userId: renter.renterUserId,
        type: 'lease.created',
        title: 'New lease created',
        body: 'A new lease has been created for you.',
        data: { leaseId: lease.id, apartmentId },
      });
    }

    return { data: this.formatLease(lease) };
  }

  async update(
    orgId: string,
    actorId: string,
    buildingId: string,
    floorId: string,
    apartmentId: string,
    leaseId: string,
    dto: UpdateLeaseDto,
  ): Promise<{ data: LeaseResponse }> {
    const existing = await this.prisma.lease.findFirst({
      where: { id: leaseId, orgId, buildingId, floorId, apartmentId },
    });
    if (!existing) throw new NotFoundException('Lease not found.');

    // Validate the resulting date range against whichever dates are being
    // changed, falling back to the stored values for the untouched one.
    const resolvedStartDate =
      dto.startDate !== undefined ? new Date(dto.startDate) : existing.startDate;
    const resolvedEndDate =
      dto.endDate !== undefined ? new Date(dto.endDate) : existing.endDate;
    this.assertValidDateRange(resolvedStartDate, resolvedEndDate);

    // F4.1: re-run the overlap check when the update touches the dates
    // and/or (re)activates the lease — excluding the lease's own row so it
    // doesn't conflict with itself.
    const resolvedStatus = dto.status ?? existing.status;
    const datesOrStatusChanging =
      dto.startDate !== undefined ||
      dto.endDate !== undefined ||
      dto.status !== undefined;
    if (datesOrStatusChanging && resolvedStatus !== 'terminated') {
      await this.assertNoOverlappingLease(
        apartmentId,
        resolvedStartDate,
        resolvedEndDate,
        leaseId,
      );
    }

    const isTerminating =
      dto.status === 'terminated' && existing.status !== 'terminated';

    const lease = await this.prisma.$transaction(async (tx) => {
      const lease = await tx.lease.update({
        where: { id: leaseId },
        data: {
          ...(dto.renterId !== undefined && { renterId: dto.renterId }),
          ...(dto.startDate !== undefined && {
            startDate: new Date(dto.startDate),
          }),
          ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
          ...(dto.rentAmount !== undefined && { rentAmount: dto.rentAmount }),
          ...(dto.depositAmount !== undefined && {
            depositAmount: dto.depositAmount,
          }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.renewalTerms !== undefined && {
            renewalTerms: dto.renewalTerms,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
      });

      if (isTerminating) {
        const apartment = await tx.apartment.findFirst({
          where: { id: apartmentId },
          select: { status: true },
        });
        if (apartment && OCCUPYING_STATUSES.has(apartment.status)) {
          await tx.apartment.update({
            where: { id: apartmentId },
            data: { status: 'vacant' },
          });
        }
      }

      return lease;
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'lease.updated',
      targetType: 'Lease',
      targetId: leaseId,
      metadata: { changes: dto },
    });

    return { data: this.formatLease(lease) };
  }

  /**
   * Closes out an active lease and opens its replacement atomically: the
   * apartment stays 'occupied' throughout (no flicker to vacant), unlike
   * update()'s terminate path which is a terminal state with no follow-up.
   */
  async renew(
    orgId: string,
    actorId: string,
    buildingId: string,
    floorId: string,
    apartmentId: string,
    leaseId: string,
    dto: RenewLeaseDto,
  ): Promise<{ data: LeaseResponse }> {
    const existing = await this.prisma.lease.findFirst({
      where: { id: leaseId, orgId, buildingId, floorId, apartmentId },
    });
    if (!existing) throw new NotFoundException('Lease not found.');

    const now = new Date();
    if (
      !this.leaseStatus.isEffectivelyActive(
        { status: existing.status, endDate: existing.endDate },
        now,
      )
    ) {
      throw new ConflictException('Only an active lease can be renewed.');
    }

    const { oldLease, newLease } = await this.prisma.$transaction(
      async (tx) => {
        const oldLease = await tx.lease.update({
          where: { id: leaseId },
          data: { status: 'terminated' },
        });
        const newLease = await tx.lease.create({
          data: {
            orgId,
            buildingId,
            floorId,
            apartmentId,
            renterId: existing.renterId,
            startDate: new Date(dto.startDate),
            endDate: new Date(dto.endDate),
            rentAmount: dto.rentAmount ?? existing.rentAmount,
            depositAmount: dto.depositAmount ?? existing.depositAmount,
            status: 'active',
            renewalTerms: dto.renewalTerms ?? existing.renewalTerms,
            notes: dto.notes ?? existing.notes,
          },
        });
        await tx.apartment.update({
          where: { id: apartmentId },
          data: { status: 'occupied' },
        });
        return { oldLease, newLease };
      },
    );

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'lease.renewed',
      targetType: 'Lease',
      targetId: newLease.id,
      metadata: {
        oldLeaseId: oldLease.id,
        newLeaseId: newLease.id,
        apartmentId,
      },
    });

    return { data: this.formatLease(newLease) };
  }

  async remove(
    orgId: string,
    actorId: string,
    buildingId: string,
    floorId: string,
    apartmentId: string,
    leaseId: string,
  ): Promise<{ data: { id: string } }> {
    const existing = await this.prisma.lease.findFirst({
      where: { id: leaseId, orgId, buildingId, floorId, apartmentId },
    });
    if (!existing) throw new NotFoundException('Lease not found.');

    const invoiceCount = await this.prisma.invoice.count({
      where: { leaseId },
    });
    if (invoiceCount > 0) {
      throw new ConflictException(
        'Cannot delete a lease that is referenced by an invoice.',
      );
    }

    await this.prisma.lease.delete({ where: { id: leaseId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'lease.deleted',
      targetType: 'Lease',
      targetId: leaseId,
      metadata: { apartmentId, renterId: existing.renterId },
    });

    return { data: { id: leaseId } };
  }
}
