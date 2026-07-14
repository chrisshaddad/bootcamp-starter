import { Prisma } from '@repo/db';
import { WorkOrderApartmentStatusService } from './work-order-apartment-status.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';

describe('WorkOrderApartmentStatusService', () => {
  const apartmentId = 'apartment-1';

  function makeService(
    overrides: {
      workOrder?: Partial<Record<string, jest.Mock>>;
      lease?: Partial<Record<string, jest.Mock>>;
      apartment?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      workOrder: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.workOrder,
      },
      lease: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.lease,
      },
      apartment: {
        update: jest.fn().mockResolvedValue({}),
        ...overrides.apartment,
      },
    };
    const leaseStatus = new LeaseStatusService();
    const service = new WorkOrderApartmentStatusService(prisma, leaseStatus);
    return { service, prisma };
  }

  const FAR_FUTURE = new Date('2099-01-01T00:00:00.000Z');
  const FAR_PAST = new Date('2000-01-01T00:00:00.000Z');

  describe('onWorkOrderOpened', () => {
    it('sets the apartment status to maintenance', async () => {
      const { service, prisma } = makeService();

      await service.onWorkOrderOpened(apartmentId);

      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: apartmentId },
        data: { status: 'maintenance' },
      });
    });
  });

  describe('onWorkOrderClosed', () => {
    it('reverts to occupied when no other open work orders remain and an active lease exists', async () => {
      const { service, prisma } = makeService({
        lease: {
          findMany: jest.fn().mockResolvedValue([
            {
              status: 'active',
              endDate: FAR_FUTURE,
            },
          ]),
        },
      });

      await service.onWorkOrderClosed(apartmentId);

      expect(prisma.workOrder.findMany).toHaveBeenCalledWith({
        where: {
          status: { in: ['scheduled', 'in_progress'] },
          maintenanceRequest: { apartmentId },
        },
      });
      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: apartmentId },
        data: { status: 'occupied' },
      });
    });

    it('reverts to vacant when no other open work orders remain and no active lease exists', async () => {
      const { service, prisma } = makeService({
        lease: {
          findMany: jest.fn().mockResolvedValue([
            {
              status: 'terminated',
              endDate: FAR_PAST,
            },
          ]),
        },
      });

      await service.onWorkOrderClosed(apartmentId);

      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: apartmentId },
        data: { status: 'vacant' },
      });
    });

    it('does not revert the apartment status while another open work order remains', async () => {
      const { service, prisma } = makeService({
        workOrder: {
          findMany: jest.fn().mockResolvedValue([{ id: 'wo-2' }]),
        },
      });

      await service.onWorkOrderClosed(apartmentId);

      expect(prisma.apartment.update).not.toHaveBeenCalled();
    });
  });
});
