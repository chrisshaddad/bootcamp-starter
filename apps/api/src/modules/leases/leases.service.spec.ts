import {
  BadRequestException,
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
      invoice?: Partial<Record<string, jest.Mock>>;
      building?: Partial<Record<string, jest.Mock>>;
      floor?: Partial<Record<string, jest.Mock>>;
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
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        ...overrides.apartment,
      },
      renter: {
        findFirst: jest.fn().mockResolvedValue({ id: renterId, orgId }),
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.renter,
      },
      invoice: {
        count: jest.fn().mockResolvedValue(0),
        ...overrides.invoice,
      },
      building: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.building,
      },
      floor: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.floor,
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

  // Comfortably in the future (well past "today" for the foreseeable life of
  // this suite) so the F4.3 past-start guard never trips on the happy path.
  const FAR_ENOUGH_FUTURE_START = '2050-01-01T00:00:00.000Z';

  const dto = {
    renterId,
    startDate: FAR_ENOUGH_FUTURE_START,
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

    it('rejects creating a lease whose end date is not after its start date', async () => {
      const { service, prisma } = makeService();

      await expect(
        service.create(orgId, actorId, buildingId, floorId, apartmentId, {
          ...dto,
          startDate: '2026-06-01T00:00:00.000Z',
          endDate: '2026-06-01T00:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.lease.create).not.toHaveBeenCalled();
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

    it('rejects creating a second active lease whose dates fully overlap an existing one', async () => {
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

    describe('date-overlap check (F4.1)', () => {
      // A bounded existing lease (not FAR_FUTURE-ended) so there's real room
      // to construct disjoint/adjacent/partial ranges around it.
      const boundedExisting = () =>
        leaseRow({
          id: 'lease-existing',
          startDate: new Date('2030-01-01T00:00:00.000Z'),
          endDate: new Date('2031-01-01T00:00:00.000Z'),
        });

      it('rejects a partial overlap at the head (new lease starts before, ends inside)', async () => {
        const { service, prisma } = makeService({
          lease: { findMany: jest.fn().mockResolvedValue([boundedExisting()]) },
        });

        await expect(
          service.create(orgId, actorId, buildingId, floorId, apartmentId, {
            ...dto,
            startDate: '2029-06-01T00:00:00.000Z',
            endDate: '2030-06-01T00:00:00.000Z',
          }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(prisma.lease.create).not.toHaveBeenCalled();
      });

      it('rejects a partial overlap at the tail (new lease starts inside, ends after)', async () => {
        const { service, prisma } = makeService({
          lease: { findMany: jest.fn().mockResolvedValue([boundedExisting()]) },
        });

        await expect(
          service.create(orgId, actorId, buildingId, floorId, apartmentId, {
            ...dto,
            startDate: '2030-06-01T00:00:00.000Z',
            endDate: '2031-06-01T00:00:00.000Z',
          }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(prisma.lease.create).not.toHaveBeenCalled();
      });

      it('allows a back-to-back lease starting exactly when the existing one ends', async () => {
        const { service, prisma } = makeService({
          lease: { findMany: jest.fn().mockResolvedValue([boundedExisting()]) },
        });
        prisma.lease.create.mockResolvedValue(leaseRow());

        await service.create(orgId, actorId, buildingId, floorId, apartmentId, {
          ...dto,
          startDate: '2031-01-01T00:00:00.000Z', // === existing.endDate
          endDate: '2032-01-01T00:00:00.000Z',
        });

        expect(prisma.lease.create).toHaveBeenCalled();
      });

      it('allows a disjoint future lease (starts well after the existing one ends)', async () => {
        const { service, prisma } = makeService({
          lease: { findMany: jest.fn().mockResolvedValue([boundedExisting()]) },
        });
        prisma.lease.create.mockResolvedValue(leaseRow());

        await service.create(orgId, actorId, buildingId, floorId, apartmentId, {
          ...dto,
          startDate: '2035-01-01T00:00:00.000Z',
          endDate: '2036-01-01T00:00:00.000Z',
        });

        expect(prisma.lease.create).toHaveBeenCalled();
      });

      it('allows a disjoint past lease (ends before the existing one starts)', async () => {
        const { service, prisma } = makeService({
          lease: { findMany: jest.fn().mockResolvedValue([boundedExisting()]) },
        });
        prisma.lease.create.mockResolvedValue(leaseRow({ status: 'draft' }));

        // Use a draft here (start-date policy F4.3 only guards 'active').
        await service.create(orgId, actorId, buildingId, floorId, apartmentId, {
          ...dto,
          status: 'draft',
          startDate: '2020-01-01T00:00:00.000Z',
          endDate: '2021-01-01T00:00:00.000Z',
        });

        expect(prisma.lease.create).toHaveBeenCalled();
      });

      it('ignores a terminated existing lease even if its dates fully overlap', async () => {
        const { service, prisma } = makeService({
          lease: {
            findMany: jest
              .fn()
              .mockResolvedValue([
                { ...boundedExisting(), status: 'terminated' },
              ]),
          },
        });
        prisma.lease.create.mockResolvedValue(leaseRow());

        await service.create(orgId, actorId, buildingId, floorId, apartmentId, {
          ...dto,
          startDate: '2030-01-01T00:00:00.000Z',
          endDate: '2031-01-01T00:00:00.000Z',
        });

        expect(prisma.lease.create).toHaveBeenCalled();
      });

      it('applies the overlap check to draft leases too (not exempt)', async () => {
        const { service, prisma } = makeService({
          lease: { findMany: jest.fn().mockResolvedValue([boundedExisting()]) },
        });

        await expect(
          service.create(orgId, actorId, buildingId, floorId, apartmentId, {
            ...dto,
            status: 'draft',
            startDate: '2030-06-01T00:00:00.000Z',
            endDate: '2030-09-01T00:00:00.000Z',
          }),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(prisma.lease.create).not.toHaveBeenCalled();
      });
    });

    describe('start-date policy (F4.3)', () => {
      it('rejects a new active lease starting in the past without recordExisting', async () => {
        const { service, prisma } = makeService();

        await expect(
          service.create(orgId, actorId, buildingId, floorId, apartmentId, {
            ...dto,
            startDate: '2020-01-01T00:00:00.000Z',
          }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.lease.create).not.toHaveBeenCalled();
      });

      it('allows a past-start active lease when recordExisting is true', async () => {
        const { service, prisma } = makeService();
        prisma.lease.create.mockResolvedValue(
          leaseRow({ startDate: new Date('2020-01-01T00:00:00.000Z') }),
        );

        await service.create(orgId, actorId, buildingId, floorId, apartmentId, {
          ...dto,
          startDate: '2020-01-01T00:00:00.000Z',
          recordExisting: true,
        });

        expect(prisma.lease.create).toHaveBeenCalled();
      });

      it('allows an active lease starting today', async () => {
        const { service, prisma } = makeService();
        const today = new Date();
        const todayUtcMidnight = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate(),
          ),
        ).toISOString();
        prisma.lease.create.mockResolvedValue(leaseRow());

        await service.create(orgId, actorId, buildingId, floorId, apartmentId, {
          ...dto,
          startDate: todayUtcMidnight,
        });

        expect(prisma.lease.create).toHaveBeenCalled();
      });

      it('allows a past-start draft lease without recordExisting (guard only applies to active)', async () => {
        const { service, prisma } = makeService();
        prisma.lease.create.mockResolvedValue(
          leaseRow({
            status: 'draft',
            startDate: new Date('2020-01-01T00:00:00.000Z'),
          }),
        );

        await service.create(orgId, actorId, buildingId, floorId, apartmentId, {
          ...dto,
          status: 'draft',
          startDate: '2020-01-01T00:00:00.000Z',
        });

        expect(prisma.lease.create).toHaveBeenCalled();
      });
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

    describe('date-overlap check (F4.1)', () => {
      it('excludes the lease being updated from the overlap check (self-exclusion)', async () => {
        const { service, prisma } = makeService({
          lease: {
            findFirst: jest.fn().mockResolvedValue(leaseRow()),
            findMany: jest.fn().mockResolvedValue([]),
          },
        });
        prisma.lease.update.mockResolvedValue(
          leaseRow({ endDate: new Date('2099-06-01T00:00:00.000Z') }),
        );

        await service.update(
          orgId,
          actorId,
          buildingId,
          floorId,
          apartmentId,
          'lease-1',
          { endDate: '2099-06-01T00:00:00.000Z' },
        );

        expect(prisma.lease.findMany).toHaveBeenCalledWith({
          where: { apartmentId, id: { not: 'lease-1' } },
          select: { status: true, startDate: true, endDate: true },
        });
        expect(prisma.lease.update).toHaveBeenCalled();
      });

      it('rejects updating a lease when the new dates overlap another non-terminated lease on the same apartment', async () => {
        const { service, prisma } = makeService({
          lease: {
            findFirst: jest.fn().mockResolvedValue(leaseRow()),
            findMany: jest.fn().mockResolvedValue([
              leaseRow({
                id: 'lease-2',
                startDate: new Date('2027-06-01T00:00:00.000Z'),
                endDate: new Date('2028-06-01T00:00:00.000Z'),
              }),
            ]),
          },
        });

        await expect(
          service.update(
            orgId,
            actorId,
            buildingId,
            floorId,
            apartmentId,
            'lease-1',
            {
              startDate: '2027-01-01T00:00:00.000Z',
              endDate: '2027-12-01T00:00:00.000Z',
            },
          ),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(prisma.lease.update).not.toHaveBeenCalled();
      });

      it('does not re-run the overlap check when neither dates nor status change', async () => {
        const { service, prisma } = makeService({
          lease: {
            findFirst: jest.fn().mockResolvedValue(leaseRow()),
          },
        });
        prisma.lease.update.mockResolvedValue(
          leaseRow({ rentAmount: new Prisma.Decimal('1600.00') }),
        );

        await service.update(
          orgId,
          actorId,
          buildingId,
          floorId,
          apartmentId,
          'lease-1',
          { rentAmount: 1600 },
        );

        expect(prisma.lease.findMany).not.toHaveBeenCalled();
        expect(prisma.lease.update).toHaveBeenCalled();
      });
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

    it('rejects deletion when an Invoice references the lease', async () => {
      const { service, prisma } = makeService({
        lease: { findFirst: jest.fn().mockResolvedValue(leaseRow()) },
        invoice: { count: jest.fn().mockResolvedValue(1) },
      });

      await expect(
        service.remove(
          orgId,
          actorId,
          buildingId,
          floorId,
          apartmentId,
          'lease-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.lease.delete).not.toHaveBeenCalled();
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

  describe('renew', () => {
    const renewDto = {
      startDate: '2027-01-01T00:00:00.000Z',
      endDate: FAR_FUTURE,
    };

    it('terminates the old lease and creates exactly one new active lease, carrying over renter/rent/deposit', async () => {
      const { service, prisma, timeline } = makeService({
        lease: { findFirst: jest.fn().mockResolvedValue(leaseRow()) },
      });
      prisma.lease.update.mockResolvedValue(leaseRow({ status: 'terminated' }));
      prisma.lease.create.mockResolvedValue(
        leaseRow({ id: 'lease-2', startDate: new Date(renewDto.startDate) }),
      );

      await service.renew(
        orgId,
        actorId,
        buildingId,
        floorId,
        apartmentId,
        'lease-1',
        renewDto,
      );

      expect(prisma.lease.update).toHaveBeenCalledWith({
        where: { id: 'lease-1' },
        data: { status: 'terminated' },
      });
      expect(prisma.lease.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId,
          buildingId,
          floorId,
          apartmentId,
          renterId,
          rentAmount: new Prisma.Decimal('1500.00'),
          depositAmount: new Prisma.Decimal('1500.00'),
          status: 'active',
        }),
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'lease.renewed',
          metadata: expect.objectContaining({
            oldLeaseId: 'lease-1',
            newLeaseId: 'lease-2',
          }),
        }),
      );
    });

    it('keeps the apartment occupied throughout', async () => {
      const { service, prisma } = makeService({
        lease: { findFirst: jest.fn().mockResolvedValue(leaseRow()) },
      });
      prisma.lease.update.mockResolvedValue(leaseRow({ status: 'terminated' }));
      prisma.lease.create.mockResolvedValue(leaseRow({ id: 'lease-2' }));

      await service.renew(
        orgId,
        actorId,
        buildingId,
        floorId,
        apartmentId,
        'lease-1',
        renewDto,
      );

      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: apartmentId },
        data: { status: 'occupied' },
      });
    });

    it('applies rent/deposit/renewalTerms/notes overrides when provided', async () => {
      const { service, prisma } = makeService({
        lease: { findFirst: jest.fn().mockResolvedValue(leaseRow()) },
      });
      prisma.lease.update.mockResolvedValue(leaseRow({ status: 'terminated' }));
      prisma.lease.create.mockResolvedValue(leaseRow({ id: 'lease-2' }));

      await service.renew(
        orgId,
        actorId,
        buildingId,
        floorId,
        apartmentId,
        'lease-1',
        { ...renewDto, rentAmount: 1800, renewalTerms: '12-month renewal' },
      );

      expect(prisma.lease.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          rentAmount: 1800,
          renewalTerms: '12-month renewal',
        }),
      });
    });

    it('rejects renewing a lease that is not effectively active', async () => {
      const { service, prisma } = makeService({
        lease: {
          findFirst: jest
            .fn()
            .mockResolvedValue(leaseRow({ status: 'terminated' })),
        },
      });

      await expect(
        service.renew(
          orgId,
          actorId,
          buildingId,
          floorId,
          apartmentId,
          'lease-1',
          renewDto,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.lease.update).not.toHaveBeenCalled();
      expect(prisma.lease.create).not.toHaveBeenCalled();
    });

    it('rejects renewing an active lease that has already expired', async () => {
      const { service } = makeService({
        lease: {
          findFirst: jest
            .fn()
            .mockResolvedValue(leaseRow({ endDate: new Date(FAR_PAST) })),
        },
      });

      await expect(
        service.renew(
          orgId,
          actorId,
          buildingId,
          floorId,
          apartmentId,
          'lease-1',
          renewDto,
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws NotFoundException for a lease outside the apartment/floor/building/org', async () => {
      const { service } = makeService();

      await expect(
        service.renew(
          orgId,
          actorId,
          buildingId,
          floorId,
          apartmentId,
          'missing',
          renewDto,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findAllForOrg', () => {
    it('returns all org leases enriched with display names for org_admin', async () => {
      const { service, prisma, buildingAccess } = makeService({
        lease: { findMany: jest.fn().mockResolvedValue([leaseRow()]) },
        building: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: buildingId, name: 'Tower A' }]),
        },
        floor: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: floorId, name: 'Floor 1' }]),
        },
        apartment: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: apartmentId, unitNumber: '101' }]),
        },
        renter: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: renterId, fullName: 'Jane Doe' }]),
        },
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue(null),
        },
      });

      const result = await service.findAllForOrg(
        orgId,
        'caller-1',
        Role.ORG_ADMIN,
      );

      expect(buildingAccess.getAllowedBuildingIds).toHaveBeenCalledWith(
        orgId,
        'caller-1',
        Role.ORG_ADMIN,
      );
      expect(prisma.lease.findMany).toHaveBeenCalledWith({
        where: { orgId },
        orderBy: { startDate: 'desc' },
      });
      expect(result.data).toEqual([
        expect.objectContaining({
          id: 'lease-1',
          buildingName: 'Tower A',
          floorName: 'Floor 1',
          unitNumber: '101',
          renterName: 'Jane Doe',
        }),
      ]);
    });

    it('constrains supervisor to their assigned buildings', async () => {
      const { service, prisma, buildingAccess } = makeService({
        lease: { findMany: jest.fn().mockResolvedValue([]) },
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue(['building-2']),
        },
      });

      await service.findAllForOrg(orgId, 'caller-1', Role.SUPERVISOR);

      expect(buildingAccess.getAllowedBuildingIds).toHaveBeenCalledWith(
        orgId,
        'caller-1',
        Role.SUPERVISOR,
      );
      expect(prisma.lease.findMany).toHaveBeenCalledWith({
        where: { orgId, buildingId: { in: ['building-2'] } },
        orderBy: { startDate: 'desc' },
      });
    });

    it('falls back to empty strings when a related record is missing', async () => {
      const { service } = makeService({
        lease: { findMany: jest.fn().mockResolvedValue([leaseRow()]) },
        building: { findMany: jest.fn().mockResolvedValue([]) },
        floor: { findMany: jest.fn().mockResolvedValue([]) },
        apartment: { findMany: jest.fn().mockResolvedValue([]) },
        renter: { findMany: jest.fn().mockResolvedValue([]) },
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue(null),
        },
      });

      const result = await service.findAllForOrg(
        orgId,
        'caller-1',
        Role.ORG_ADMIN,
      );

      expect(result.data).toEqual([
        expect.objectContaining({
          buildingName: '',
          floorName: '',
          unitNumber: '',
          renterName: '',
        }),
      ]);
    });
  });
});
