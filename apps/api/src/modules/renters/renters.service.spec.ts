import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { RentersService } from './renters.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';
import { Role } from '@/common/enums';

describe('RentersService', () => {
  const orgId = 'org-1';
  const actorId = 'actor-1';

  const FAR_FUTURE = new Date('2099-01-01T00:00:00.000Z');

  function makeService(
    overrides: {
      renter?: Partial<Record<string, jest.Mock>>;
      lease?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma = {
      renter: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.renter,
      },
      lease: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        ...overrides.lease,
      },
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const buildingAccess = {
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      getAllowedBuildingIds: jest.fn().mockResolvedValue(null),
      ...overrides.buildingAccess,
    };
    const leaseStatus = new LeaseStatusService();
    const service = new RentersService(
      prisma as any,
      timeline as any,
      buildingAccess as any,
      leaseStatus,
    );
    return { service, prisma, timeline, buildingAccess };
  }

  const renterRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'renter-1',
    orgId,
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    emergencyContactName: null,
    emergencyContactPhone: null,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    leases: [],
    ...overrides,
  });

  const leaseRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'lease-1',
    orgId,
    buildingId: 'building-1',
    floorId: 'floor-1',
    apartmentId: 'apartment-1',
    renterId: 'renter-1',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: FAR_FUTURE,
    rentAmount: new Prisma.Decimal('1500.00'),
    depositAmount: new Prisma.Decimal('1500.00'),
    status: 'active',
    renewalTerms: null,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  describe('findAll', () => {
    it('returns all renters in the org for org-wide roles, deriving effectiveStatus from the most recent lease', async () => {
      const { service, prisma } = makeService({
        renter: {
          findMany: jest
            .fn()
            .mockResolvedValue([renterRow({ leases: [leaseRow()] })]),
        },
      });

      const result = await service.findAll(orgId, 'caller-1', Role.ORG_ADMIN);

      expect(prisma.renter.findMany).toHaveBeenCalledWith({
        where: { orgId },
        include: { leases: { orderBy: { startDate: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'asc' },
      });
      expect(result.data).toEqual([
        expect.objectContaining({ id: 'renter-1', effectiveStatus: 'current' }),
      ]);
    });

    it('reports "former" when the most recent lease has ended', async () => {
      const { service } = makeService({
        renter: {
          findMany: jest.fn().mockResolvedValue([
            renterRow({
              leases: [leaseRow({ status: 'terminated' })],
            }),
          ]),
        },
      });

      const result = await service.findAll(orgId, 'caller-1', Role.ORG_ADMIN);

      expect(result.data[0]).toEqual(
        expect.objectContaining({ effectiveStatus: 'former' }),
      );
    });

    it('reports "none" when the renter has no leases', async () => {
      const { service } = makeService({
        renter: { findMany: jest.fn().mockResolvedValue([renterRow()]) },
      });

      const result = await service.findAll(orgId, 'caller-1', Role.ORG_ADMIN);

      expect(result.data[0]).toEqual(
        expect.objectContaining({ effectiveStatus: 'none' }),
      );
    });

    it('filters to renters with a lease in an allowed building for building-scoped roles', async () => {
      const { service, prisma, buildingAccess } = makeService({
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue(['building-1']),
        },
      });

      await service.findAll(orgId, 'caller-1', Role.SUPERVISOR);

      expect(buildingAccess.getAllowedBuildingIds).toHaveBeenCalledWith(
        orgId,
        'caller-1',
        Role.SUPERVISOR,
      );
      expect(prisma.renter.findMany).toHaveBeenCalledWith({
        where: {
          orgId,
          leases: { some: { buildingId: { in: ['building-1'] } } },
        },
        include: { leases: { orderBy: { startDate: 'desc' }, take: 1 } },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('returns the renter with full lease history, most-recent-first', async () => {
      const { service } = makeService({
        renter: {
          findFirst: jest
            .fn()
            .mockResolvedValue(renterRow({ leases: [leaseRow()] })),
        },
      });

      const result = await service.findOne(
        orgId,
        'caller-1',
        Role.ORG_ADMIN,
        'renter-1',
      );

      expect(result.data).toEqual(
        expect.objectContaining({
          id: 'renter-1',
          effectiveStatus: 'current',
          leases: [expect.objectContaining({ id: 'lease-1' })],
        }),
      );
    });

    it('throws NotFoundException for a renter outside the org', async () => {
      const { service } = makeService();

      await expect(
        service.findOne(orgId, 'caller-1', Role.ORG_ADMIN, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException for a building-scoped caller with no connection to the renter', async () => {
      const { service } = makeService({
        renter: {
          findFirst: jest
            .fn()
            .mockResolvedValue(
              renterRow({ leases: [leaseRow({ buildingId: 'building-2' })] }),
            ),
        },
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue(['building-1']),
        },
      });

      await expect(
        service.findOne(orgId, 'caller-1', Role.SUPERVISOR, 'renter-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('create', () => {
    const dto = { fullName: 'Jane Doe' };

    it('creates a renter scoped to the org and emits renter.created', async () => {
      const { service, prisma, timeline } = makeService();
      prisma.renter.create.mockResolvedValue(renterRow());

      await service.create(orgId, actorId, dto);

      expect(prisma.renter.create).toHaveBeenCalledWith({
        data: {
          orgId,
          fullName: 'Jane Doe',
          email: undefined,
          phone: undefined,
          emergencyContactName: undefined,
          emergencyContactPhone: undefined,
          notes: undefined,
        },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId,
          actorId,
          action: 'renter.created',
          targetType: 'Renter',
        }),
      );
    });
  });

  describe('update', () => {
    it('updates only the provided fields and emits renter.updated', async () => {
      const { service, prisma, timeline } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renterRow()) },
      });
      prisma.renter.update.mockResolvedValue(
        renterRow({ fullName: 'Jane Smith' }),
      );

      await service.update(orgId, actorId, 'renter-1', {
        fullName: 'Jane Smith',
      });

      expect(prisma.renter.update).toHaveBeenCalledWith({
        where: { id: 'renter-1' },
        data: { fullName: 'Jane Smith' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'renter.updated' }),
      );
    });

    it('throws NotFoundException for a renter outside the org', async () => {
      const { service } = makeService();

      await expect(
        service.update(orgId, actorId, 'missing', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the renter and emits renter.deleted', async () => {
      const { service, prisma, timeline } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renterRow()) },
      });

      await service.remove(orgId, actorId, 'renter-1');

      expect(prisma.renter.delete).toHaveBeenCalledWith({
        where: { id: 'renter-1' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'renter.deleted' }),
      );
    });

    it('throws NotFoundException for a renter outside the org', async () => {
      const { service } = makeService();

      await expect(
        service.remove(orgId, actorId, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects deleting a renter that has leases on record, even a terminated one', async () => {
      const { service, prisma } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renterRow()) },
        lease: { count: jest.fn().mockResolvedValue(1) },
      });

      await expect(
        service.remove(orgId, actorId, 'renter-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.renter.delete).not.toHaveBeenCalled();
    });
  });
});
