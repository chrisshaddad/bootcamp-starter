import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
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
  ): Promise<void> {
    const renter = await this.prisma.renter.findFirst({
      where: { id: renterId, orgId },
      select: { id: true },
    });
    if (!renter) throw new NotFoundException('Renter not found.');
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
    await this.assertRenterInOrg(orgId, dto.renterId);

    const resolvedStatus = dto.status ?? 'active';
    const now = new Date();

    if (resolvedStatus === 'active') {
      const existingLeases = await this.prisma.lease.findMany({
        where: { apartmentId },
      });
      const hasActiveLease = existingLeases.some((l) =>
        this.leaseStatus.isEffectivelyActive(
          { status: l.status, endDate: l.endDate },
          now,
        ),
      );
      if (hasActiveLease) {
        throw new ConflictException(
          'This apartment already has an active lease.',
        );
      }
    }

    const lease = await this.prisma.$transaction(async (tx) => {
      const lease = await tx.lease.create({
        data: {
          orgId,
          buildingId,
          floorId,
          apartmentId,
          renterId: dto.renterId,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
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
