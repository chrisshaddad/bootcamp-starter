import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { Role } from '@/common/enums';
import {
  MaintenanceRequestPriority,
  MaintenanceRequestResponse,
  MaintenanceRequestStatus,
} from '@repo/contracts';

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
  ) {}

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
}
