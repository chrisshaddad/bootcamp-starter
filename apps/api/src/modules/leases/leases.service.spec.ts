import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { LeasesService } from './leases.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';
import { Role } from '@/common/enums';

describe('LeasesService', () => {
  const orgId = 'org-1';
  const buildingId = 'building-1';
  const floorId = 'floor-1';
  const apartmentId = 'apartment-1';
  const renterId = 'renter-1';
  const actorId = 'actor-1';

  const FAR_FUTURE = '2099-01-01T00:00:00.000Z';
  const FAR_PAST = '2000-01-01T00:00:00.000Z';

  function makeService(
    overrides: {
      lease?: Partial<Record<string, jest.Mock>>;
      apartment?: Partial<Record<string, jest.Mock>>;
      renter?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      lease: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.lease,
      },
      apartment: {
        findFirst: jest.fn().mockResolvedValue({
          id: apartmentId,
          orgId,
          buildingId,
          floorId,
          status: 'vacant',
        }),
        update: jest.fn().mockResolvedValue({}),
        ...overrides.apartment,
      },
      renter: {
        findFirst: jest.fn().mockResolvedValue({ id: renterId, orgId }),
        ...overrides.renter,
      },
    };
    prisma.$transaction = jest.fn(async (cb: (tx: unknown) => unknown) =>
      cb(prisma),
    );

    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const buildingAccess = {
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      getAllowedBuildingIds: jest.fn(),
      ...overrides.buildingAccess,
    };
    const leaseStatus = new LeaseStatusService();
    const service = new LeasesService(
      prisma,
      timeline as any,
      buildingAccess as any,
      leaseStatus,
    );
    return { service, prisma, timeline, buildingAccess, leaseStatus };
  }

  const leaseRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'lease-1',
    orgId,
    buildingId,
    floorId,
    apartmentId,
    renterId,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date(FAR_FUTURE),
    rentAmount: new Prisma.Decimal('1500.00'),
    depositAmount: new Prisma.Decimal('1500.00'),
    status: 'active',
    renewalTerms: null,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const dto = {
    renterId,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: FAR_FUTURE,
    rentAmount: 1500,
    depositAmount: 1500,
  };

  describe('create', () => {
    it('creates an active lease and syncs the apartment to occupied', async () => {
      const { service, prisma } = makeService();
      prisma.lease.create.mockResolvedValue(leaseRow());

      await service.create(
        orgId,
        actorId,
        buildingId,
        floorId,
        apartmentId,
        dto,
      );

      expect(prisma.lease.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId,
          buildingId,
          floorId,
          apartmentId,
          renterId,
          status: 'active',
        }),
      });
      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: apartmentId },
        data: { status: 'occupied' },
      });
    });

    it('does not sync the apartment when created with an explicit non-active status', async () => {
      const { service, prisma } = makeService();
      prisma.lease.create.mockResolvedValue(leaseRow({ status: 'draft' }));

      await service.create(orgId, actorId, buildingId, floorId, apartmentId, {
        ...dto,
        status: 'draft',
      });

      expect(prisma.apartment.update).not.toHaveBeenCalled();
    });

    it('rejects creating a second active lease on an apartment that already has one', async () => {
      const { service, prisma } = makeService({
        lease: {
          findMany: jest.fn().mockResolvedValue([leaseRow()]),
        },
      });

      await expect(
        service.create(orgId, actorId, buildingId, floorId, apartmentId, dto),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.lease.create).not.toHaveBeenCalled();
    });

    it('allows creating a draft lease alongside an existing active lease', async () => {
      const { service, prisma } = makeService({
        lease: {
          findMany: jest.fn().mockResolvedValue([leaseRow()]),
        },
      });
      prisma.lease.create.mockResolvedValue(leaseRow({ status: 'draft' }));

      await service.create(orgId, actorId, buildingId, floorId, apartmentId, {
        ...dto,
        status: 'draft',
      });

      expect(prisma.lease.create).toHaveBeenCalled();
    });

    it('allows a new active lease when the existing one has already expired', async () => {
      const { service, prisma } = makeService({
        lease: {
          findMany: jest
            .fn()
            .mockResolvedValue([leaseRow({ endDate: new Date(FAR_PAST) })]),
        },
      });
      prisma.lease.create.mockResolvedValue(leaseRow());

      await service.create(
        orgId,
        actorId,
        buildingId,
        floorId,
        apartmentId,
        dto,
      );

      expect(prisma.lease.create).toHaveBeenCalled();
    });

    it('throws NotFoundException when the apartment does not belong to the floor/building/org', async () => {
      const { service } = makeService({
        apartment: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.create(orgId, actorId, buildingId, floorId, apartmentId, dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when the renter does not belong to the org', async () => {
      const { service } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.create(orgId, actorId, buildingId, floorId, apartmentId, dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('reverts the apartment to vacant when terminating the only active lease', async () => {
      const { service, prisma } = makeService({
        lease: {
          findFirst: jest.fn().mockResolvedValue(leaseRow()),
          findMany: jest.fn().mockResolvedValue([leaseRow()]),
        },
        apartment: {
          findFirst: jest.fn().mockResolvedValue({
            id: apartmentId,
            orgId,
            buildingId,
            floorId,
            status: 'occupied',
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      prisma.lease.update.mockResolvedValue(leaseRow({ status: 'terminated' }));

      await service.update(
        orgId,
        actorId,
        buildingId,
        floorId,
        apartmentId,
        'lease-1',
        { status: 'terminated' },
      );

      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: apartmentId },
        data: { status: 'vacant' },
      });
    });

    it('does not touch the apartment status when it was manually set to maintenance', async () => {
      const { service, prisma } = makeService({
        lease: {
          findFirst: jest.fn().mockResolvedValue(leaseRow()),
          findMany: jest.fn().mockResolvedValue([leaseRow()]),
        },
        apartment: {
          findFirst: jest.fn().mockResolvedValue({
            id: apartmentId,
            orgId,
            buildingId,
            floorId,
            status: 'maintenance',
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      prisma.lease.update.mockResolvedValue(leaseRow({ status: 'terminated' }));

      await service.update(
        orgId,
        actorId,
        buildingId,
        floorId,
        apartmentId,
        'lease-1',
        { status: 'terminated' },
      );

      expect(prisma.apartment.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a lease outside the apartment/floor/building/org', async () => {
      const { service } = makeService();

      await expect(
        service.update(
          orgId,
          actorId,
          buildingId,
          floorId,
          apartmentId,
          'missing',
          {},
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the lease and emits lease.deleted', async () => {
      const { service, prisma, timeline } = makeService({
        lease: { findFirst: jest.fn().mockResolvedValue(leaseRow()) },
      });

      await service.remove(
        orgId,
        actorId,
        buildingId,
        floorId,
        apartmentId,
        'lease-1',
      );

      expect(prisma.lease.delete).toHaveBeenCalledWith({
        where: { id: 'lease-1' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'lease.deleted' }),
      );
    });
  });

  describe('findAll', () => {
    it('orders leases by startDate desc', async () => {
      const { service, prisma } = makeService({
        lease: { findMany: jest.fn().mockResolvedValue([leaseRow()]) },
      });

      await service.findAll(
        orgId,
        'caller-1',
        Role.ORG_ADMIN,
        buildingId,
        floorId,
        apartmentId,
      );

      expect(prisma.lease.findMany).toHaveBeenCalledWith({
        where: { orgId, buildingId, floorId, apartmentId },
        orderBy: { startDate: 'desc' },
      });
    });

    it('propagates building-access rejection for scoped roles', async () => {
      const { service, buildingAccess } = makeService({
        buildingAccess: {
          assertBuildingAccess: jest
            .fn()
            .mockRejectedValue(new ForbiddenException()),
        },
      });

      await expect(
        service.findAll(
          orgId,
          'caller-1',
          Role.SUPERVISOR,
          buildingId,
          floorId,
          apartmentId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(buildingAccess.assertBuildingAccess).toHaveBeenCalledWith(
        orgId,
        'caller-1',
        Role.SUPERVISOR,
        buildingId,
      );
    });
  });
});
