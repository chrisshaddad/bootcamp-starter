import { BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const orgId = 'org-1';
  // Fixed clock so month/year window boundaries are deterministic.
  const now = new Date('2026-07-17T10:00:00.000Z');
  const MONTH_START = '2026-07-01T00:00:00.000Z';
  const YEAR_START = '2026-01-01T00:00:00.000Z';

  const decimal = (value: string) => ({ toNumber: () => Number(value) });

  function makeService(
    overrides: {
      lease?: Partial<Record<string, jest.Mock>>;
      apartment?: Partial<Record<string, jest.Mock>>;
      invoice?: Partial<Record<string, jest.Mock>>;
      invoicePayment?: Partial<Record<string, jest.Mock>>;
      expense?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      lease: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.lease,
      },
      apartment: {
        count: jest.fn().mockResolvedValue(0),
        ...overrides.apartment,
      },
      invoice: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.invoice,
      },
      invoicePayment: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        ...overrides.invoicePayment,
      },
      expense: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { amount: null } }),
        ...overrides.expense,
      },
    };
    const service = new ReportsService(prisma);
    return { service, prisma };
  }

  describe('getSummary', () => {
    it('computes occupancy, active leases, and MTD/YTD income/expenses/net', async () => {
      const { service, prisma } = makeService({
        lease: { count: jest.fn().mockResolvedValue(5) },
        apartment: {
          count: jest
            .fn()
            .mockImplementation(({ where }: { where: { status?: string } }) =>
              Promise.resolve(where.status ? 7 : 10),
            ),
        },
        invoicePayment: {
          aggregate: jest
            .fn()
            .mockImplementation(
              ({ where }: { where: { paidAt: { gte: Date } } }) => {
                const gte = where.paidAt.gte.toISOString();
                if (gte === MONTH_START)
                  return Promise.resolve({ _sum: { amount: decimal('1000') } });
                if (gte === YEAR_START)
                  return Promise.resolve({ _sum: { amount: decimal('5000') } });
                return Promise.resolve({ _sum: { amount: null } });
              },
            ),
        },
        expense: {
          aggregate: jest
            .fn()
            .mockImplementation(
              ({ where }: { where: { incurredAt: { gte: Date } } }) => {
                const gte = where.incurredAt.gte.toISOString();
                if (gte === MONTH_START)
                  return Promise.resolve({ _sum: { amount: decimal('400') } });
                if (gte === YEAR_START)
                  return Promise.resolve({ _sum: { amount: decimal('2000') } });
                return Promise.resolve({ _sum: { amount: null } });
              },
            ),
        },
      });

      const { data } = await service.getSummary(orgId, {}, now);

      expect(prisma.lease.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId, status: 'active' }),
        }),
      );
      expect(data).toEqual({
        activeLeases: 5,
        totalApartments: 10,
        occupiedApartments: 7,
        occupancyPct: 70,
        mtdIncome: '1000.00',
        ytdIncome: '5000.00',
        mtdExpenses: '400.00',
        ytdExpenses: '2000.00',
        mtdNet: '600.00',
        ytdNet: '3000.00',
        range: null,
      });
    });

    it('reports 0% occupancy and zeroed money when the org is empty', async () => {
      const { service } = makeService();

      const { data } = await service.getSummary(orgId, {}, now);

      expect(data.occupancyPct).toBe(0);
      expect(data.mtdIncome).toBe('0.00');
      expect(data.ytdNet).toBe('0.00');
      expect(data.range).toBeNull();
    });

    it('computes a custom date-range window when from+to are provided', async () => {
      const { service } = makeService({
        invoicePayment: {
          aggregate: jest
            .fn()
            .mockImplementation(
              ({ where }: { where: { paidAt: { gte: Date } } }) => {
                const gte = where.paidAt.gte.toISOString();
                if (gte === MONTH_START || gte === YEAR_START)
                  return Promise.resolve({ _sum: { amount: null } });
                return Promise.resolve({ _sum: { amount: decimal('250') } });
              },
            ),
        },
        expense: {
          aggregate: jest
            .fn()
            .mockImplementation(
              ({ where }: { where: { incurredAt: { gte: Date } } }) => {
                const gte = where.incurredAt.gte.toISOString();
                if (gte === MONTH_START || gte === YEAR_START)
                  return Promise.resolve({ _sum: { amount: null } });
                return Promise.resolve({ _sum: { amount: decimal('100') } });
              },
            ),
        },
      });

      const { data } = await service.getSummary(
        orgId,
        { from: '2026-06-01', to: '2026-06-30' },
        now,
      );

      expect(data.range).toEqual({
        from: '2026-06-01T00:00:00.000Z',
        to: '2026-06-30T00:00:00.000Z',
        income: '250.00',
        expenses: '100.00',
        net: '150.00',
      });
    });

    it('rejects when only one of from/to is provided', async () => {
      const { service } = makeService();

      await expect(
        service.getSummary(orgId, { from: '2026-06-01' }, now),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid range date', async () => {
      const { service } = makeService();

      await expect(
        service.getSummary(
          orgId,
          { from: 'not-a-date', to: '2026-06-30' },
          now,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getRentRoll', () => {
    it('returns one row per active lease with lifetime invoiced/paid/balance', async () => {
      const leaseRow = {
        id: 'lease-1',
        rentAmount: decimal('1500'),
        renter: { fullName: 'Jane Tenant' },
        apartment: { unitNumber: '101' },
        invoices: [
          {
            lineItems: [
              { amount: decimal('1000') },
              { amount: decimal('200') },
            ],
            payments: [{ amount: decimal('500') }],
          },
          {
            lineItems: [{ amount: decimal('1000') }],
            payments: [{ amount: decimal('300') }],
          },
        ],
      };
      const { service, prisma } = makeService({
        lease: { findMany: jest.fn().mockResolvedValue([leaseRow]) },
      });

      const { data } = await service.getRentRoll(orgId, now);

      expect(prisma.lease.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ orgId, status: 'active' }),
        }),
      );
      expect(data).toEqual([
        {
          leaseId: 'lease-1',
          unitNumber: '101',
          renterName: 'Jane Tenant',
          rent: '1500.00',
          invoiced: '2200.00',
          paid: '800.00',
          balance: '1400.00',
        },
      ]);
    });
  });

  describe('getOverdue', () => {
    const overdueInvoice = {
      id: 'inv-overdue',
      dueDate: new Date('2026-07-10T00:00:00.000Z'),
      lineItems: [{ amount: decimal('1000') }],
      payments: [{ amount: decimal('200') }],
      lease: {
        renter: { fullName: 'Late Larry' },
        apartment: { unitNumber: '202' },
      },
    };
    const paidInvoice = {
      id: 'inv-paid',
      dueDate: new Date('2026-06-01T00:00:00.000Z'),
      lineItems: [{ amount: decimal('500') }],
      payments: [{ amount: decimal('500') }],
      lease: {
        renter: { fullName: 'Paid Paula' },
        apartment: { unitNumber: '303' },
      },
    };

    it('returns only past-due invoices with an outstanding balance', async () => {
      const { service } = makeService({
        invoice: {
          findMany: jest.fn().mockResolvedValue([overdueInvoice, paidInvoice]),
        },
      });

      const { data } = await service.getOverdue(orgId, undefined, now);

      expect(data).toHaveLength(1);
      expect(data[0]).toEqual({
        invoiceId: 'inv-overdue',
        unitNumber: '202',
        renterName: 'Late Larry',
        dueDate: '2026-07-10T00:00:00.000Z',
        invoiced: '1000.00',
        paid: '200.00',
        balance: '800.00',
        daysOverdue: 7,
      });
    });

    it('honors an explicit asOf date', async () => {
      const { service, prisma } = makeService({
        invoice: { findMany: jest.fn().mockResolvedValue([]) },
      });

      await service.getOverdue(orgId, '2026-07-15', now);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId,
            dueDate: { lt: new Date('2026-07-15') },
          }),
        }),
      );
    });

    it('rejects an invalid asOf date', async () => {
      const { service } = makeService();

      await expect(
        service.getOverdue(orgId, 'nope', now),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
