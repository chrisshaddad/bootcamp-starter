import { Prisma } from '@repo/db';
import { RecurringInvoicesService } from './recurring-invoices.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';

describe('RecurringInvoicesService', () => {
  const orgId = 'org-1';
  const buildingId = 'building-1';
  const leaseId = 'lease-1';

  function makeService(
    overrides: {
      invoice?: Partial<Record<string, jest.Mock>>;
      lease?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation((args: any) =>
            Promise.resolve({ id: 'invoice-new', ...args.data }),
          ),
        ...overrides.invoice,
      },
      lease: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.lease,
      },
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const leaseStatus = new LeaseStatusService();
    const service = new RecurringInvoicesService(
      prisma,
      timeline as any,
      leaseStatus,
    );
    return { service, prisma, timeline, leaseStatus };
  }

  const lease = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: leaseId,
    orgId,
    buildingId,
    startDate: new Date('2026-01-15T00:00:00.000Z'),
    endDate: new Date('2027-01-15T00:00:00.000Z'),
    status: 'active',
    rentAmount: new Prisma.Decimal('1000.00'),
    ...overrides,
  });

  describe('generateForLease', () => {
    it('creates an invoice when the next due date is within the 7-day lead window', async () => {
      const { service, prisma, timeline } = makeService();
      const asOf = new Date('2026-06-15T00:00:00.000Z'); // anchor day 15 — due today

      const result = await service.generateForLease(lease(), asOf);

      expect(result).toBe('created');
      expect(prisma.invoice.create).toHaveBeenCalledWith({
        data: {
          orgId,
          buildingId,
          leaseId,
          dueDate: new Date('2026-06-15T00:00:00.000Z'),
          billingPeriod: '2026-06',
          lineItems: {
            create: [
              {
                category: 'rent',
                description: 'Monthly rent',
                amount: expect.any(Prisma.Decimal),
              },
            ],
          },
        },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId,
          action: 'invoice.auto_generated',
          targetType: 'Invoice',
          metadata: { leaseId, billingPeriod: '2026-06' },
        }),
      );
    });

    it('clamps a 31st anchor into a short month (Feb) and still generates within the window', async () => {
      const { service, prisma } = makeService();
      const shortMonthLease = lease({
        startDate: new Date('2026-01-31T00:00:00.000Z'),
      });
      const asOf = new Date('2026-02-24T00:00:00.000Z'); // 4 days before Feb 28 (clamped)

      const result = await service.generateForLease(shortMonthLease, asOf);

      expect(result).toBe('created');
      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dueDate: new Date('2026-02-28T00:00:00.000Z'),
            billingPeriod: '2026-02',
          }),
        }),
      );
    });

    it('returns not-due when the next occurrence is more than 7 days away', async () => {
      const { service, prisma } = makeService();
      const asOf = new Date('2026-06-01T00:00:00.000Z'); // anchor 15th — 14 days away

      const result = await service.generateForLease(lease(), asOf);

      expect(result).toBe('not-due');
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('returns skipped-existing when an invoice already exists for the billing period', async () => {
      const { service, prisma } = makeService({
        invoice: {
          findUnique: jest.fn().mockResolvedValue({ id: 'existing-invoice' }),
        },
      });
      const asOf = new Date('2026-06-15T00:00:00.000Z');

      const result = await service.generateForLease(lease(), asOf);

      expect(result).toBe('skipped-existing');
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('is idempotent: calling generateForLease twice for the same period creates exactly one invoice', async () => {
      // Fake the DB unique constraint on (leaseId, billingPeriod) with a tiny
      // in-memory store, so the second call's findUnique sees what the first
      // call's create wrote.
      const store = new Map<string, unknown>();
      const { service, prisma } = makeService({
        invoice: {
          findUnique: jest.fn().mockImplementation(({ where }: any) => {
            const key = `${where.leaseId_billingPeriod.leaseId}:${where.leaseId_billingPeriod.billingPeriod}`;
            return Promise.resolve(store.get(key) ?? null);
          }),
          create: jest.fn().mockImplementation(({ data }: any) => {
            const key = `${data.leaseId}:${data.billingPeriod}`;
            const row = { id: `invoice-${store.size + 1}`, ...data };
            store.set(key, row);
            return Promise.resolve(row);
          }),
        },
      });
      const asOf = new Date('2026-06-15T00:00:00.000Z');
      const theLease = lease();

      const first = await service.generateForLease(theLease, asOf);
      const second = await service.generateForLease(theLease, asOf);

      expect(first).toBe('created');
      expect(second).toBe('skipped-existing');
      expect(prisma.invoice.create).toHaveBeenCalledTimes(1);
    });

    it('treats a P2002 unique-constraint race on create as skipped-existing', async () => {
      const { service, prisma } = makeService({
        invoice: {
          create: jest.fn().mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('duplicate', {
              code: 'P2002',
              clientVersion: 'test',
            }),
          ),
        },
      });
      const asOf = new Date('2026-06-15T00:00:00.000Z');

      const result = await service.generateForLease(lease(), asOf);

      expect(result).toBe('skipped-existing');
    });

    it('returns inactive when the lease has already ended by the candidate due date', async () => {
      const { service, prisma } = makeService();
      const endedLease = lease({
        startDate: new Date('2025-01-15T00:00:00.000Z'),
        endDate: new Date('2026-05-31T00:00:00.000Z'), // ended before the June candidate
      });
      const asOf = new Date('2026-06-10T00:00:00.000Z');

      const result = await service.generateForLease(endedLease, asOf);

      expect(result).toBe('inactive');
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    it('returns inactive for a non-active (draft/terminated) lease status', async () => {
      const { service } = makeService();
      const draftLease = lease({ status: 'draft' });
      const asOf = new Date('2026-06-15T00:00:00.000Z');

      const result = await service.generateForLease(draftLease, asOf);

      expect(result).toBe('inactive');
    });

    it('returns inactive when the computed candidate falls before the lease actually starts', async () => {
      const { service, prisma } = makeService();
      // Lease doesn't start until August 10th; asOf is in early June, well
      // before the lease starts, yet the periodic anchor's June occurrence
      // still falls within the 7-day lead window relative to asOf.
      const futureLease = lease({
        startDate: new Date('2026-08-10T00:00:00.000Z'),
        endDate: new Date('2027-08-10T00:00:00.000Z'),
      });
      const asOf = new Date('2026-06-05T00:00:00.000Z');

      const result = await service.generateForLease(futureLease, asOf);

      expect(result).toBe('inactive');
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });
  });

  describe('runForOrg', () => {
    it("aggregates created/skipped/considered across the org's active leases", async () => {
      const dueLease = lease({ id: 'lease-due' });
      const notDueLease = lease({
        id: 'lease-not-due',
        startDate: new Date('2026-01-01T00:00:00.000Z'),
      });
      const { service, prisma } = makeService({
        lease: {
          findMany: jest.fn().mockResolvedValue([dueLease, notDueLease]),
        },
      });
      const asOf = new Date('2026-06-15T00:00:00.000Z');

      const result = await service.runForOrg(orgId, asOf);

      expect(prisma.lease.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId, status: 'active' } }),
      );
      expect(result.leasesConsidered).toBe(2);
      expect(result.generated).toBe(1);
      expect(result.skippedExisting).toBe(0);
    });
  });

  describe('runAll', () => {
    it('sums runForOrg results across every org with an active lease', async () => {
      const { service, prisma } = makeService({
        lease: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce([{ orgId: 'org-a' }, { orgId: 'org-b' }]) // distinct orgId query
            .mockResolvedValueOnce([lease({ orgId: 'org-a' })]) // org-a leases
            .mockResolvedValueOnce([lease({ orgId: 'org-b', id: 'lease-2' })]), // org-b leases
        },
      });
      const asOf = new Date('2026-06-15T00:00:00.000Z');

      const result = await service.runAll(asOf);

      expect(prisma.lease.findMany).toHaveBeenNthCalledWith(1, {
        where: { status: 'active' },
        select: { orgId: true },
        distinct: ['orgId'],
      });
      expect(result.leasesConsidered).toBe(2);
      expect(result.generated).toBe(2);
      expect(result.skippedExisting).toBe(0);
    });
  });
});
