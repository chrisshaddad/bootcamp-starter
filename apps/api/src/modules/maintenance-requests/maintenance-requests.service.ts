import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { Role } from '@/common/enums';
import {
  MaintenanceRequestDetailResponse,
  MaintenanceRequestPriority,
  MaintenanceRequestResponse,
  MaintenanceRequestStatus,
} from '@repo/contracts';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';
import { formatWorkOrder } from '@/modules/work-orders/work-order-formatter';

const INCLUDE = {
  apartment: { select: { unitNumber: true } },
  renter: { select: { fullName: true } },
} as const;

/** Human phrasing for a status, used in tenant-facing notification copy. */
const STATUS_LABELS: Record<string, string> = {
  open: 'open',
  in_progress: 'in progress',
  resolved: 'resolved',
  closed: 'closed',
};

type MaintenanceRequestRow = {
  id: string;
  orgId: string;
  buildingId: string;
  apartmentId: string;
  renterId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  apartment: { unitNumber: string };
  renter: { fullName: string };
};

@Injectable()
export class MaintenanceRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buildingAccess: BuildingAccessService,
    private readonly timeline: TimelineService,
    private readonly notifications: NotificationsService,
  ) {}

  private assertOrgAdmin(callerRole: Role): void {
    if (callerRole !== Role.ORG_ADMIN) {
      throw new ForbiddenException(
        'Only an org admin can write to maintenance requests.',
      );
    }
  }

  // ── Format helpers ────────────────────────────────────────────────────────

  private formatMaintenanceRequest(
    request: MaintenanceRequestRow,
  ): MaintenanceRequestResponse {
    return {
      id: request.id,
      orgId: request.orgId,
      buildingId: request.buildingId,
      apartmentId: request.apartmentId,
      renterId: request.renterId,
      title: request.title,
      description: request.description,
      status: request.status as MaintenanceRequestStatus,
      priority: request.priority as MaintenanceRequestPriority,
      notes: request.notes,
      apartmentUnitNumber: request.apartment.unitNumber,
      renterName: request.renter.fullName,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
    };
  }

  // ── CRUD (read) ───────────────────────────────────────────────────────────

  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
  ): Promise<{ data: MaintenanceRequestResponse[] }> {
    const allowedBuildingIds = await this.buildingAccess.getAllowedBuildingIds(
      orgId,
      callerId,
      callerRole,
    );

    const requests = await this.prisma.maintenanceRequest.findMany({
      where: {
        orgId,
        ...(allowedBuildingIds && { buildingId: { in: allowedBuildingIds } }),
      },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return { data: requests.map((r) => this.formatMaintenanceRequest(r)) };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    requestId: string,
  ): Promise<{ data: MaintenanceRequestDetailResponse }> {
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id: requestId, orgId },
      include: INCLUDE,
    });
    if (!request) {
      throw new NotFoundException('Maintenance request not found.');
    }

    await this.buildingAccess.assertBuildingAccess(
      orgId,
      callerId,
      callerRole,
      request.buildingId,
    );

    const workOrders = await this.prisma.workOrder.findMany({
      where: { maintenanceRequestId: requestId, orgId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: {
        ...this.formatMaintenanceRequest(request),
        workOrders: workOrders.map((w) => formatWorkOrder(w)),
      },
    };
  }

  // ── CRUD (write) ──────────────────────────────────────────────────────────

  async create(
    orgId: string,
    actorId: string,
    callerRole: Role,
    dto: CreateMaintenanceRequestDto,
  ): Promise<{ data: MaintenanceRequestResponse }> {
    this.assertOrgAdmin(callerRole);

    if (!dto.buildingId || !dto.apartmentId || !dto.renterId || !dto.title) {
      throw new BadRequestException(
        'buildingId, apartmentId, renterId, and title are required.',
      );
    }

    const request = await this.prisma.maintenanceRequest.create({
      data: {
        orgId,
        buildingId: dto.buildingId,
        apartmentId: dto.apartmentId,
        renterId: dto.renterId,
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        notes: dto.notes,
      },
      include: INCLUDE,
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'maintenance_request.created',
      targetType: 'MaintenanceRequest',
      targetId: request.id,
      metadata: { title: request.title, apartmentId: request.apartmentId },
    });

    return { data: this.formatMaintenanceRequest(request) };
  }

  async update(
    orgId: string,
    actorId: string,
    callerRole: Role,
    requestId: string,
    dto: UpdateMaintenanceRequestDto,
  ): Promise<{ data: MaintenanceRequestResponse }> {
    this.assertOrgAdmin(callerRole);

    const existing = await this.prisma.maintenanceRequest.findFirst({
      where: { id: requestId, orgId },
      include: { renter: { select: { renterUserId: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Maintenance request not found.');
    }

    const request = await this.prisma.maintenanceRequest.update({
      where: { id: requestId },
      data: {
        ...(dto.buildingId !== undefined && { buildingId: dto.buildingId }),
        ...(dto.apartmentId !== undefined && {
          apartmentId: dto.apartmentId,
        }),
        ...(dto.renterId !== undefined && { renterId: dto.renterId }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: INCLUDE,
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'maintenance_request.updated',
      targetType: 'MaintenanceRequest',
      targetId: requestId,
      metadata: { changes: Object.keys(dto) },
    });

    // Close the loop with the tenant. Without this the tenant portal shows a
    // stale badge and the reporter has no way to follow their own request.
    // Only a REAL status transition is worth a notification (editing a note or
    // the priority is not), and never notify the actor about their own change.
    const statusChanged = request.status !== existing.status;
    const tenantUserId = existing.renter.renterUserId;
    if (statusChanged && tenantUserId && tenantUserId !== actorId) {
      await this.notifications.enqueue({
        orgId,
        userId: tenantUserId,
        type: `maintenance_request.${request.status}`,
        title: `Maintenance request ${STATUS_LABELS[request.status] ?? request.status}`,
        body: `Your request "${request.title}" is now ${STATUS_LABELS[request.status] ?? request.status}.`,
        data: {
          requestId,
          status: request.status,
          requestTitle: request.title,
        },
      });
    }

    return { data: this.formatMaintenanceRequest(request) };
  }

  async remove(
    orgId: string,
    actorId: string,
    callerRole: Role,
    requestId: string,
  ): Promise<{ data: { id: string } }> {
    this.assertOrgAdmin(callerRole);

    const existing = await this.prisma.maintenanceRequest.findFirst({
      where: { id: requestId, orgId },
    });
    if (!existing) {
      throw new NotFoundException('Maintenance request not found.');
    }

    await this.prisma.maintenanceRequest.delete({ where: { id: requestId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'maintenance_request.deleted',
      targetType: 'MaintenanceRequest',
      targetId: requestId,
      metadata: { title: existing.title },
    });

    return { data: { id: requestId } };
  }
}
