import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';
import { WorkOrderStatus } from '@repo/db';

const OPEN_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.scheduled,
  WorkOrderStatus.in_progress,
];

@Injectable()
export class WorkOrderApartmentStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaseStatus: LeaseStatusService,
  ) {}

  async onWorkOrderOpened(apartmentId: string): Promise<void> {
    await this.prisma.apartment.update({
      where: { id: apartmentId },
      data: { status: 'maintenance' },
    });
  }

  /**
   * Reverts the apartment's status only if no other scheduled/in_progress
   * Work Order (across any Maintenance Request) still references it —
   * mirrors LeasesService's OCCUPYING_STATUSES guard for the same reason:
   * don't clobber a status another still-open job depends on.
   */
  async onWorkOrderClosed(apartmentId: string): Promise<void> {
    const stillOpen = await this.prisma.workOrder.findMany({
      where: {
        status: { in: OPEN_WORK_ORDER_STATUSES },
        maintenanceRequest: { apartmentId },
      },
    });
    if (stillOpen.length > 0) return;

    const leases = await this.prisma.lease.findMany({
      where: { apartmentId },
    });
    const now = new Date();
    const hasActiveLease = leases.some((lease) =>
      this.leaseStatus.isEffectivelyActive(
        { status: lease.status, endDate: lease.endDate },
        now,
      ),
    );

    await this.prisma.apartment.update({
      where: { id: apartmentId },
      data: { status: hasActiveLease ? 'occupied' : 'vacant' },
    });
  }
}
