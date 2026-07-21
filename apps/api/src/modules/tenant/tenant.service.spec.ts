import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';

describe('TenantService', () => {
  const orgId = 'org-1';
  const sub = 'kc-sub-tenant-1';
  const now = new Date('2026-07-17T10:00:00.000Z');
  const FAR_FUTURE = new Date('2099-01-01T00:00:00.000Z');
  const PAST = new Date('2020-01-01T00:00:00.000Z');

  const decimal = (value: string) => ({ toNumber: () => Number(value) });

  function makeService(
    overrides: {
      renter?: Partial<Record<string, jest.Mock>>;
      lease?: Partial<Record<string, jest.Mock>>;
      invoice?: Partial<Record<string, jest.Mock>>;
      maintenanceRequest?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      renter: {
        findFirst: jest.fn().mockResolvedValue(null),
        ...overrides.renter,
      },
      lease: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.lease,
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.invoice,
      },
      maintenanceRequest: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        ...overrides.maintenanceRequest,
      },
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const leaseStatus = new LeaseStatusService();
    const service = new TenantService(
      prisma as any,
      leaseStatus,
      timeline as any,
    );
    return { service, prisma, timeline };
  }

  const renter = { id: 'renter-1', fullName: 'Jane Doe', email: null, phone: null };

  const leaseRow = (overrides: Record<string, unknown> = {}) => ({
    id: 'lease-1',
    buildingId: 'building-1',
    apartmentId: 'apartment-1',
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: FAR_FUTURE,
    rentAmount: decimal('1500.00'),
    depositAmount: decimal('1500.00'),
    status: 'active',
    apartment: { unitNumber: '4B', building: { name: 'Cedar Court' } },
    ...overrides,
  });

  describe('getOverview', () => {
    it('returns an unlinked empty overview when no renter is bound to the caller', async () => {
      const { service, prisma } = makeService();

      const { data } = await service.getOverview(orgId, sub, now);

      expect(data.linked).toBe(false);
      expect(data.renter).toBeNull();
      expect(data.lease).toBeNull();
      expect(data.leaseHistory).toEqual([]);
      expect(data.invoices).toEqual([]);
      expect(data.maintenanceRequests).toEqual([]);
      expect(data.balance).toEqual({
        invoiced: '0.00',
        paid: '0.00',
        outstanding: '0.00',
      });
      // The linkage lookup is scoped to org + the caller's own sub.
      expect(prisma.renter.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId, renterUserId: sub },
        }),
      );
    });

    it('surfaces the active lease, lifetime balance, and the tenant’s requests', async () => {
      const { service } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renter) },
        lease: { findMany: jest.fn().mockResolvedValue([leaseRow()]) },
        invoice: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'inv-1',
              dueDate: PAST, // past due + unpaid -> overdue
              lineItems: [{ amount: decimal('1000') }],
              payments: [{ amount: decimal('400') }],
            },
            {
              id: 'inv-2',
              dueDate: FAR_FUTURE,
              lineItems: [{ amount: decimal('500') }],
              payments: [{ amount: decimal('500') }], // fully paid
            },
          ]),
        },
        maintenanceRequest: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'mr-1',
              title: 'Leaky tap',
              description: null,
              status: 'open',
              priority: 'high',
              createdAt: now,
              apartment: { unitNumber: '4B' },
            },
          ]),
        },
      });

      const { data } = await service.getOverview(orgId, sub, now);

      expect(data.linked).toBe(true);
      expect(data.renter).toEqual({
        id: 'renter-1',
        fullName: 'Jane Doe',
        email: null,
        phone: null,
      });
      expect(data.lease).toEqual(
        expect.objectContaining({
          id: 'lease-1',
          unitNumber: '4B',
          buildingName: 'Cedar Court',
          rentAmount: '1500.00',
          status: 'active',
          effectiveStatus: 'active',
        }),
      );
      // invoiced 1000+500=1500, paid 400+500=900, outstanding 600
      expect(data.balance).toEqual({
        invoiced: '1500.00',
        paid: '900.00',
        outstanding: '600.00',
      });
      expect(data.invoices).toHaveLength(2);
      const overdue = data.invoices.find((i) => i.id === 'inv-1');
      expect(overdue).toEqual(
        expect.objectContaining({ balance: '600.00', status: 'overdue' }),
      );
      expect(data.maintenanceRequests).toEqual([
        expect.objectContaining({ id: 'mr-1', unitNumber: '4B' }),
      ]);
    });

    it('returns the full lease history newest-first, distinct from the single current lease', async () => {
      const olderLease = leaseRow({
        id: 'lease-0',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2025-01-01T00:00:00.000Z'),
        status: 'ended',
        apartment: { unitNumber: '2A', building: { name: 'Old Building' } },
      });
      const currentLease = leaseRow(); // startDate 2026-01-01, newer
      const { service } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renter) },
        // Prisma orders by startDate desc, so the mock returns newest first.
        lease: {
          findMany: jest
            .fn()
            .mockResolvedValue([currentLease, olderLease]),
        },
      });

      const { data } = await service.getOverview(orgId, sub, now);

      expect(data.leaseHistory).toHaveLength(2);
      expect(data.leaseHistory.map((l) => l.id)).toEqual([
        'lease-1',
        'lease-0',
      ]);
      expect(data.leaseHistory[1]).toEqual(
        expect.objectContaining({
          id: 'lease-0',
          unitNumber: '2A',
          buildingName: 'Old Building',
          status: 'ended',
        }),
      );
      // `lease` remains the single current one, unaffected by the history list.
      expect(data.lease?.id).toBe('lease-1');
    });

    it('derives effectiveStatus expired for an active lease whose endDate has passed', async () => {
      const { service } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renter) },
        lease: {
          findMany: jest
            .fn()
            .mockResolvedValue([leaseRow({ status: 'active', endDate: PAST })]),
        },
      });

      const { data } = await service.getOverview(orgId, sub, now);

      expect(data.lease?.status).toBe('active');
      expect(data.lease?.effectiveStatus).toBe('expired');
    });
  });

  describe('createMaintenanceRequest', () => {
    it('rejects an unlinked tenant with 403', async () => {
      const { service } = makeService();

      await expect(
        service.createMaintenanceRequest(orgId, sub, { title: 'X' }, now),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects when the tenant has no effectively-active lease', async () => {
      const { service } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renter) },
        lease: {
          findMany: jest
            .fn()
            .mockResolvedValue([leaseRow({ status: 'terminated' })]),
        },
      });

      await expect(
        service.createMaintenanceRequest(orgId, sub, { title: 'X' }, now),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates a request scoped to the tenant’s own apartment and emits a self-actor event', async () => {
      const create = jest.fn().mockResolvedValue({
        id: 'mr-9',
        title: 'Broken heater',
        description: 'No heat',
        status: 'open',
        priority: 'medium',
        createdAt: now,
        apartment: { unitNumber: '4B' },
      });
      const { service, prisma, timeline } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renter) },
        lease: { findMany: jest.fn().mockResolvedValue([leaseRow()]) },
        maintenanceRequest: { create },
      });

      const { data } = await service.createMaintenanceRequest(
        orgId,
        sub,
        { title: '  Broken heater  ', description: 'No heat' },
        now,
      );

      // buildingId/apartmentId/renterId are derived from the active lease, never
      // from client input.
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId,
            buildingId: 'building-1',
            apartmentId: 'apartment-1',
            renterId: 'renter-1',
            title: 'Broken heater',
          }),
        }),
      );
      // No explicit status/priority in the create data -> DB defaults (open/medium).
      expect(create.mock.calls[0][0].data.status).toBeUndefined();
      expect(create.mock.calls[0][0].data.priority).toBeUndefined();
      expect(prisma.maintenanceRequest.create).toHaveBeenCalledTimes(1);
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId,
          actorId: sub,
          action: 'maintenance_request.created',
          targetType: 'MaintenanceRequest',
          targetId: 'mr-9',
        }),
      );
      expect(data).toEqual(
        expect.objectContaining({ id: 'mr-9', unitNumber: '4B' }),
      );
    });

    it('forwards a provided priority to the created request', async () => {
      const create = jest.fn().mockResolvedValue({
        id: 'mr-10',
        title: 'Flood',
        description: null,
        status: 'open',
        priority: 'urgent',
        createdAt: now,
        apartment: { unitNumber: '4B' },
      });
      const { service } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renter) },
        lease: { findMany: jest.fn().mockResolvedValue([leaseRow()]) },
        maintenanceRequest: { create },
      });

      await service.createMaintenanceRequest(
        orgId,
        sub,
        { title: 'Flood', priority: 'urgent' as any },
        now,
      );

      expect(create.mock.calls[0][0].data.priority).toBe('urgent');
    });
  });
});
