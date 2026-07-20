import { Prisma } from '@repo/db';
import { WorkOrderResponse, formatWorkOrderNumber } from '@repo/contracts';

export type WorkOrderRow = {
  id: string;
  orgId: string;
  number: number;
  maintenanceRequestId: string;
  vendorId: string | null;
  assignedUserId: string | null;
  status: string;
  cost: Prisma.Decimal | null;
  resolutionNotes: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

/** Shared by WorkOrdersService and MaintenanceRequestsService (request detail history). */
export function formatWorkOrder(workOrder: WorkOrderRow): WorkOrderResponse {
  return {
    id: workOrder.id,
    orgId: workOrder.orgId,
    number: workOrder.number,
    numberLabel: formatWorkOrderNumber(workOrder.number),
    maintenanceRequestId: workOrder.maintenanceRequestId,
    vendorId: workOrder.vendorId,
    assignedUserId: workOrder.assignedUserId,
    status: workOrder.status as WorkOrderResponse['status'],
    cost: workOrder.cost?.toString() ?? null,
    resolutionNotes: workOrder.resolutionNotes,
    completedAt: workOrder.completedAt?.toISOString() ?? null,
    createdAt: workOrder.createdAt.toISOString(),
    updatedAt: workOrder.updatedAt.toISOString(),
  };
}
