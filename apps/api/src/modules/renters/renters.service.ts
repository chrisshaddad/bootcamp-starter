import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { isAxiosError } from 'axios';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';
import { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';
import { formatLease, LeaseRow } from '@/modules/leases/lease-formatter';
import { Role } from '@/common/enums';
import {
  LeaseStatus,
  RenterDetailResponse,
  RenterResponse,
} from '@repo/contracts';
import { CreateRenterDto } from './dto/create-renter.dto';
import { UpdateRenterDto } from './dto/update-renter.dto';

type RenterRow = {
  id: string;
  orgId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
  renterUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class RentersService {
  private readonly logger = new Logger(RentersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly buildingAccess: BuildingAccessService,
    private readonly leaseStatus: LeaseStatusService,
    private readonly keycloakAdmin: KeycloakAdminService,
  ) {}

  // ── Format helpers ────────────────────────────────────────────────────────

  private formatRenter(
    renter: RenterRow,
    mostRecentLease: LeaseRow | null | undefined,
  ): RenterResponse {
    const now = new Date();
    return {
      id: renter.id,
      orgId: renter.orgId,
      fullName: renter.fullName,
      email: renter.email,
      phone: renter.phone,
      emergencyContactName: renter.emergencyContactName,
      emergencyContactPhone: renter.emergencyContactPhone,
      notes: renter.notes,
      renterUserId: renter.renterUserId,
      effectiveStatus: !mostRecentLease
        ? 'none'
        : this.leaseStatus.isEffectivelyActive(
              {
                status: mostRecentLease.status as LeaseStatus,
                endDate: mostRecentLease.endDate,
              },
              now,
            )
          ? 'current'
          : 'former',
      createdAt: renter.createdAt.toISOString(),
      updatedAt: renter.updatedAt.toISOString(),
    };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
  ): Promise<{ data: RenterResponse[] }> {
    const allowedBuildingIds = await this.buildingAccess.getAllowedBuildingIds(
      orgId,
      callerId,
      callerRole,
    );

    const where =
      allowedBuildingIds === null
        ? { orgId }
        : {
            orgId,
            leases: { some: { buildingId: { in: allowedBuildingIds } } },
          };

    const renters = await this.prisma.renter.findMany({
      where,
      include: { leases: { orderBy: { startDate: 'desc' as const }, take: 1 } },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: renters.map((r) => this.formatRenter(r, r.leases[0])),
    };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    renterId: string,
  ): Promise<{ data: RenterDetailResponse }> {
    const renter = await this.prisma.renter.findFirst({
      where: { id: renterId, orgId },
      include: { leases: { orderBy: { startDate: 'desc' as const } } },
    });
    if (!renter) throw new NotFoundException('Renter not found.');

    const allowedBuildingIds = await this.buildingAccess.getAllowedBuildingIds(
      orgId,
      callerId,
      callerRole,
    );
    if (allowedBuildingIds !== null) {
      const hasAccess = renter.leases.some((l) =>
        allowedBuildingIds.includes(l.buildingId),
      );
      if (!hasAccess) {
        throw new ForbiddenException(
          'You are not assigned to any building connected to this renter.',
        );
      }
    }

    const now = new Date();
    return {
      data: {
        ...this.formatRenter(renter, renter.leases[0]),
        leases: renter.leases.map((l) => formatLease(l, now, this.leaseStatus)),
      },
    };
  }

  async create(
    orgId: string,
    actorId: string,
    dto: CreateRenterDto,
  ): Promise<{ data: RenterResponse }> {
    // portalLogin wins over a passed-through renterUserId (see CreateRenterBody).
    let renterUserId = dto.renterUserId;
    let portalLoginMinted = false;

    if (dto.portalLogin) {
      const [firstName = '', ...rest] = dto.fullName.trim().split(' ');
      const lastName = rest.join(' ');

      try {
        renterUserId = await this.keycloakAdmin.createUserWithPassword({
          username: dto.portalLogin.email,
          password: dto.portalLogin.password,
          email: dto.portalLogin.email,
          firstName,
          lastName,
          attributes: { org_id: [orgId] },
        });
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 409) {
          throw new ConflictException(
            'A portal login with this email already exists.',
          );
        }
        throw error;
      }

      // Tenant is NOT a CAPPED_ROLE and does not get building assignments —
      // unlike staff (see UsersService.create).
      await this.keycloakAdmin.setSingleClientRole(renterUserId, Role.TENANT);
      portalLoginMinted = true;
    }

    let renter: RenterRow;
    try {
      renter = await this.prisma.renter.create({
        data: {
          orgId,
          fullName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          emergencyContactName: dto.emergencyContactName,
          emergencyContactPhone: dto.emergencyContactPhone,
          notes: dto.notes,
          renterUserId,
        },
      });
    } catch (error) {
      // Best-effort rollback: don't strand a Keycloak login with no renter row.
      if (portalLoginMinted && renterUserId) {
        try {
          await this.keycloakAdmin.deleteUser(renterUserId);
        } catch (cleanupError) {
          this.logger.warn(
            `Failed to roll back Keycloak user ${renterUserId} after renter creation failure: ${String(cleanupError)}`,
          );
        }
      }
      throw error;
    }

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'renter.created',
      targetType: 'Renter',
      targetId: renter.id,
      metadata: {
        fullName: renter.fullName,
        ...(portalLoginMinted && { portalLogin: true }),
      },
    });

    return { data: this.formatRenter(renter, null) };
  }

  async update(
    orgId: string,
    actorId: string,
    renterId: string,
    dto: UpdateRenterDto,
  ): Promise<{ data: RenterResponse }> {
    const existing = await this.prisma.renter.findFirst({
      where: { id: renterId, orgId },
    });
    if (!existing) throw new NotFoundException('Renter not found.');

    const renter = await this.prisma.renter.update({
      where: { id: renterId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.emergencyContactName !== undefined && {
          emergencyContactName: dto.emergencyContactName,
        }),
        ...(dto.emergencyContactPhone !== undefined && {
          emergencyContactPhone: dto.emergencyContactPhone,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.renterUserId !== undefined && {
          renterUserId: dto.renterUserId,
        }),
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'renter.updated',
      targetType: 'Renter',
      targetId: renterId,
      metadata: { changes: Object.keys(dto) },
    });

    const mostRecentLease = await this.prisma.lease.findFirst({
      where: { renterId },
      orderBy: { startDate: 'desc' },
    });

    return { data: this.formatRenter(renter, mostRecentLease) };
  }

  async remove(
    orgId: string,
    actorId: string,
    renterId: string,
  ): Promise<{ data: { id: string } }> {
    const existing = await this.prisma.renter.findFirst({
      where: { id: renterId, orgId },
    });
    if (!existing) throw new NotFoundException('Renter not found.');

    const leaseCount = await this.prisma.lease.count({
      where: { renterId },
    });
    if (leaseCount > 0) {
      throw new ConflictException(
        'Cannot delete a renter that has leases on record.',
      );
    }

    await this.prisma.renter.delete({ where: { id: renterId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'renter.deleted',
      targetType: 'Renter',
      targetId: renterId,
      metadata: { fullName: existing.fullName },
    });

    return { data: { id: renterId } };
  }
}
