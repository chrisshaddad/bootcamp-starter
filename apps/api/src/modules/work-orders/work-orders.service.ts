import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { BuildingAccessService } from '@/common/building-access/building-access.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { WorkOrderApartmentStatusService } from './work-order-apartment-status.service';
import { Role } from '@/common/enums';
import { WorkOrderResponse } from '@repo/contracts';
import { formatWorkOrder } from './work-order-formatter';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderDto } from './dto/update-work-order.dto';

const OPEN_STATUSES = new Set(['scheduled', 'in_progress']);
const MAINTENANCE_ALLOWED_FIELDS = new Set(['status', 'resolutionNotes']);

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly buildingAccess: BuildingAccessService,
    private readonly timeline: TimelineService,
    private readonly workOrderApartmentStatus: WorkOrderApartmentStatusService,
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

  // ── CRUD (write) ──────────────────────────────────────────────────────────

  async create(
    orgId: string,
    actorId: string,
    callerRole: Role,
    maintenanceRequestId: string,
    dto: CreateWorkOrderDto,
  ): Promise<{ data: WorkOrderResponse }> {
    if (callerRole !== Role.ORG_ADMIN) {
      throw new ForbiddenException(
        'Only an org admin can create a work order.',
      );
    }

    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id: maintenanceRequestId, orgId },
      select: { apartmentId: true },
    });
    if (!request) {
      throw new NotFoundException('Maintenance request not found.');
    }

    if (!!dto.vendorId === !!dto.assignedUserId) {
      throw new BadRequestException(
        'Exactly one of vendorId or assignedUserId must be set.',
      );
    }

    const workOrder = await this.prisma.workOrder.create({
      data: {
        orgId,
        maintenanceRequestId,
        vendorId: dto.vendorId,
        assignedUserId: dto.assignedUserId,
        status: dto.status,
        cost: dto.cost,
        resolutionNotes: dto.resolutionNotes,
      },
    });

    await this.workOrderApartmentStatus.onWorkOrderOpened(request.apartmentId);

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'work_order.created',
      targetType: 'WorkOrder',
      targetId: workOrder.id,
      metadata: {
        maintenanceRequestId,
        vendorId: dto.vendorId,
        assignedUserId: dto.assignedUserId,
      },
    });

    return { data: formatWorkOrder(workOrder) };
  }

  async update(
    orgId: string,
    actorId: string,
    callerId: string,
    callerRole: Role,
    maintenanceRequestId: string,
    workOrderId: string,
    dto: UpdateWorkOrderDto,
  ): Promise<{ data: WorkOrderResponse }> {
    const existing = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, orgId, maintenanceRequestId },
      include: { maintenanceRequest: { select: { apartmentId: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Work order not found.');
    }

    if (callerRole === Role.MAINTENANCE) {
      if (existing.assignedUserId !== callerId) {
        throw new ForbiddenException(
          'You can only update a work order assigned to you.',
        );
      }
      for (const key of Object.keys(dto)) {
        if (!MAINTENANCE_ALLOWED_FIELDS.has(key)) {
          throw new ForbiddenException(
            'You can only update status and resolutionNotes.',
          );
        }
      }
    } else if (callerRole !== Role.ORG_ADMIN) {
      throw new ForbiddenException(
        'Only an org admin can update a work order.',
      );
    }

    const vendorProvided = dto.vendorId !== undefined;
    const assigneeProvided = dto.assignedUserId !== undefined;
    if (vendorProvided && assigneeProvided) {
      throw new BadRequestException(
        'Provide only one of vendorId or assignedUserId when reassigning.',
      );
    }

    let vendorId = existing.vendorId;
    let assignedUserId = existing.assignedUserId;
    if (vendorProvided) {
      vendorId = dto.vendorId ?? null;
      assignedUserId = null;
    }
    if (assigneeProvided) {
      assignedUserId = dto.assignedUserId ?? null;
      vendorId = null;
    }
    if (!vendorId && !assignedUserId) {
      throw new BadRequestException(
        'A work order must have either a vendor or an assignee.',
      );
    }

    const wasOpen = OPEN_STATUSES.has(existing.status);
    const willBeStatus = dto.status ?? existing.status;
    const willBeOpen = OPEN_STATUSES.has(willBeStatus);

    let completedAt =
      dto.completedAt !== undefined
        ? dto.completedAt
          ? new Date(dto.completedAt)
          : null
        : undefined;
    if (
      dto.status === 'completed' &&
      existing.status !== 'completed' &&
      completedAt === undefined
    ) {
      completedAt = new Date();
    }

    const reassigning = vendorProvided || assigneeProvided;

    const workOrder = await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: {
        ...(reassigning && { vendorId, assignedUserId }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.cost !== undefined && { cost: dto.cost }),
        ...(dto.resolutionNotes !== undefined && {
          resolutionNotes: dto.resolutionNotes,
        }),
        ...(completedAt !== undefined && { completedAt }),
      },
    });

    if (wasOpen && !willBeOpen) {
      await this.workOrderApartmentStatus.onWorkOrderClosed(
        existing.maintenanceRequest.apartmentId,
      );
    } else if (!wasOpen && willBeOpen) {
      await this.workOrderApartmentStatus.onWorkOrderOpened(
        existing.maintenanceRequest.apartmentId,
      );
    }

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'work_order.updated',
      targetType: 'WorkOrder',
      targetId: workOrderId,
      metadata: { changes: Object.keys(dto) },
    });

    return { data: formatWorkOrder(workOrder) };
  }

  async remove(
    orgId: string,
    actorId: string,
    callerRole: Role,
    maintenanceRequestId: string,
    workOrderId: string,
  ): Promise<{ data: { id: string } }> {
    if (callerRole !== Role.ORG_ADMIN) {
      throw new ForbiddenException(
        'Only an org admin can delete a work order.',
      );
    }

    const existing = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, orgId, maintenanceRequestId },
      include: { maintenanceRequest: { select: { apartmentId: true } } },
    });
    if (!existing) {
      throw new NotFoundException('Work order not found.');
    }

    const expenseCount = await this.prisma.expense.count({
      where: { workOrderId },
    });
    if (expenseCount > 0) {
      throw new ConflictException(
        'Cannot delete a work order that is referenced by an expense.',
      );
    }

    await this.prisma.workOrder.delete({ where: { id: workOrderId } });

    await this.workOrderApartmentStatus.onWorkOrderClosed(
      existing.maintenanceRequest.apartmentId,
    );

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'work_order.deleted',
      targetType: 'WorkOrder',
      targetId: workOrderId,
      metadata: { maintenanceRequestId },
    });

    return { data: { id: workOrderId } };
  }
}
