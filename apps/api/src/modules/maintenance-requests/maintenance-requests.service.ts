import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { Role } from '@/common/enums';
import {
  MaintenanceRequestPriority,
  MaintenanceRequestResponse,
  MaintenanceRequestStatus,
} from '@repo/contracts';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { UpdateMaintenanceRequestDto } from './dto/update-maintenance-request.dto';

const INCLUDE = {
  apartment: { select: { unitNumber: true } },
  renter: { select: { fullName: true } },
} as const;

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
  ): Promise<{ data: MaintenanceRequestResponse }> {
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

    return { data: this.formatMaintenanceRequest(request) };
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
