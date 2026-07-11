import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { Role } from '@/common/enums';
import { WorkOrderResponse } from '@repo/contracts';
import { formatWorkOrder } from './work-order-formatter';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buildingAccess: BuildingAccessService,
  ) {}

  async findAllForRequest(
    orgId: string,
    callerId: string,
    callerRole: Role,
    maintenanceRequestId: string,
  ): Promise<{ data: WorkOrderResponse[] }> {
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id: maintenanceRequestId, orgId },
      select: { buildingId: true },
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
      where: { maintenanceRequestId, orgId },
      orderBy: { createdAt: 'desc' },
    });

    return { data: workOrders.map((w) => formatWorkOrder(w)) };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    maintenanceRequestId: string,
    workOrderId: string,
  ): Promise<{ data: WorkOrderResponse }> {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, orgId, maintenanceRequestId },
      include: { maintenanceRequest: { select: { buildingId: true } } },
    });
    if (!workOrder) {
      throw new NotFoundException('Work order not found.');
    }

    await this.buildingAccess.assertBuildingAccess(
      orgId,
      callerId,
      callerRole,
      workOrder.maintenanceRequest.buildingId,
    );

    return { data: formatWorkOrder(workOrder) };
  }
}
