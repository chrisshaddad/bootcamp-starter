import { ApartmentStatusSweepService } from './apartment-status-sweep.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';

describe('ApartmentStatusSweepService', () => {
  const orgId = 'org-1';
  const FAR_FUTURE = new Date('2099-01-01T00:00:00.000Z');
  const FAR_PAST = new Date('2000-01-01T00:00:00.000Z');

  function makeService(
    overrides: {
      apartment?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      apartment: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        ...overrides.apartment,
      },
    };
    const leaseStatus = new LeaseStatusService();
    const service = new ApartmentStatusSweepService(prisma, leaseStatus);
    return { service, prisma };
  }

  describe('sweepForOrg', () => {
    it('queries only occupied apartments, scoped to the org', async () => {
      const { service, prisma } = makeService();

      await service.sweepForOrg(orgId);

      expect(prisma.apartment.findMany).toHaveBeenCalledWith({
        where: { orgId, status: 'occupied' },
        select: {
          id: true,
          leases: { select: { status: true, endDate: true } },
        },
      });
    });

    it('reverts an occupied apartment with no effectively-active lease to vacant', async () => {
      const { service, prisma } = makeService({
        apartment: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'apt-1',
              leases: [{ status: 'terminated', endDate: FAR_PAST }],
            },
          ]),
        },
      });

      const result = await service.sweepForOrg(orgId);

      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: 'apt-1' },
        data: { status: 'vacant' },
      });
      expect(result).toEqual({ reverted: 1, considered: 1 });
    });

    it('reverts an occupied apartment with no leases at all', async () => {
      const { service, prisma } = makeService({
        apartment: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: 'apt-1', leases: [] }]),
        },
      });

      const result = await service.sweepForOrg(orgId);

      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: 'apt-1' },
        data: { status: 'vacant' },
      });
      expect(result).toEqual({ reverted: 1, considered: 1 });
    });

    it('leaves an occupied apartment alone when it still has an effectively-active lease', async () => {
      const { service, prisma } = makeService({
        apartment: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'apt-1',
              leases: [{ status: 'active', endDate: FAR_FUTURE }],
            },
          ]),
        },
      });

      const result = await service.sweepForOrg(orgId);

      expect(prisma.apartment.update).not.toHaveBeenCalled();
      expect(result).toEqual({ reverted: 0, considered: 1 });
    });

    it('reports considered/reverted counts across a mix of apartments', async () => {
      const { service, prisma } = makeService({
        apartment: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'apt-1', leases: [] },
            {
              id: 'apt-2',
              leases: [{ status: 'active', endDate: FAR_FUTURE }],
            },
            {
              id: 'apt-3',
              leases: [{ status: 'active', endDate: FAR_PAST }], // expired
            },
          ]),
        },
      });

      const result = await service.sweepForOrg(orgId);

      expect(prisma.apartment.update).toHaveBeenCalledTimes(2);
      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: 'apt-1' },
        data: { status: 'vacant' },
      });
      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: 'apt-3' },
        data: { status: 'vacant' },
      });
      expect(result).toEqual({ reverted: 2, considered: 3 });
    });
  });

  describe('sweepAll', () => {
    it('sweeps across every org (no orgId filter)', async () => {
      const { service, prisma } = makeService();

      await service.sweepAll();

      expect(prisma.apartment.findMany).toHaveBeenCalledWith({
        where: { status: 'occupied' },
        select: {
          id: true,
          leases: { select: { status: true, endDate: true } },
        },
      });
    });
  });
});
