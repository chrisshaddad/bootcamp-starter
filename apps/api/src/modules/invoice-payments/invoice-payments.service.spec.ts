import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvoicePaymentsService } from './invoice-payments.service';
import { Role } from '@/common/enums';

describe('InvoicePaymentsService', () => {
  const orgId = 'org-1';
  const callerId = 'caller-1';
  const buildingId = 'building-1';

  function makeService(
    overrides: {
      invoicePayment?: Partial<Record<string, jest.Mock>>;
      invoice?: Partial<Record<string, jest.Mock>>;
      building?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
      notifications?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      invoicePayment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { amount: null }, _count: { _all: 0 } }),
        groupBy: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        delete: jest.fn(),
        ...overrides.invoicePayment,
      },
      invoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.invoice,
      },
      building: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.building,
      },
    };
    const buildingAccess = {
      getAllowedBuildingIds: jest.fn().mockResolvedValue(null),
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      ...overrides.buildingAccess,
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const notifications = {
      enqueue: jest.fn().mockResolvedValue(undefined),
      ...overrides.notifications,
    };
    const service = new InvoicePaymentsService(
      prisma,
      buildingAccess as any,
      timeline as any,
      notifications as any,
    );
    return { service, prisma, buildingAccess, timeline, notifications };
  }

  const decimal = (value: string) => ({
    toString: () => value,
    toNumber: () => Number(value),
  });

  const paymentRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'payment-1',
    orgId,
    invoiceId: 'invoice-1',
    amount: decimal('500.00'),
    method: 'cash',
    paidAt: new Date('2026-02-01T00:00:00.000Z'),
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  const invoiceForSummary = (
    overrides: Partial<Record<string, unknown>> = {},
  ) => ({
    dueDate: new Date('2099-02-01T00:00:00.000Z'),
    lineItems: [{ amount: decimal('1000.00') }],
    payments: [{ amount: decimal('500.00') }],
    ...overrides,
  });

  /** A payment row as returned with ENRICHED_INCLUDE (the register list shape). */
  const enrichedRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    ...paymentRow(),
    invoice: {
      buildingId,
      leaseId: 'lease-1',
      dueDate: new Date('2099-02-01T00:00:00.000Z'),
      lineItems: [{ amount: decimal('1000.00') }],
      payments: [{ amount: decimal('500.00') }],
      lease: {
        renterId: 'renter-1',
        renter: { fullName: 'Sara Haddad' },
        apartment: { unitNumber: 'G-01' },
      },
    },
    ...overrides,
  });

  describe('findAll', () => {
    it('sees the full org for a finance caller', async () => {
      const { service, prisma, buildingAccess } = makeService({
        invoicePayment: {
          findMany: jest.fn().mockResolvedValue([enrichedRow()]),
          count: jest.fn().mockResolvedValue(1),
        },
      });

      await service.findAll(orgId, callerId, Role.FINANCE);

      expect(buildingAccess.getAllowedBuildingIds).toHaveBeenCalledWith(
        orgId,
        callerId,
        Role.FINANCE,
      );
      expect(prisma.invoicePayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId } }),
      );
    });

    it('filters to allowed building ids for a supervisor', async () => {
      const { service, prisma } = makeService({
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue([buildingId]),
        },
      });

      await service.findAll(orgId, callerId, Role.SUPERVISOR);

      expect(prisma.invoicePayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            orgId,
            invoice: { buildingId: { in: [buildingId] } },
          },
        }),
      );
    });

    it('filters by invoiceId when provided', async () => {
      const { service, prisma } = makeService();

      await service.findAll(orgId, callerId, Role.ORG_ADMIN, {
        invoiceId: 'invoice-1',
      });

      expect(prisma.invoicePayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId, invoiceId: 'invoice-1' },
        }),
      );
    });

    it('returns the paginated { items, total, page, limit } envelope', async () => {
      const { service } = makeService({
        invoicePayment: {
          findMany: jest.fn().mockResolvedValue([enrichedRow()]),
          count: jest.fn().mockResolvedValue(7),
        },
      });

      const result = await service.findAll(orgId, callerId, Role.ORG_ADMIN, {
        page: 2,
        limit: 5,
      });

      expect(result.total).toBe(7);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.items).toHaveLength(1);
    });

    it('clamps limit to the maximum and page to at least 1', async () => {
      const { service, prisma } = makeService();

      const result = await service.findAll(orgId, callerId, Role.ORG_ADMIN, {
        page: 0,
        limit: 5000,
      });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
      expect(prisma.invoicePayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
    });

    it('enriches each row with renter, unit, building and parent-invoice state', async () => {
      const { service } = makeService({
        invoicePayment: {
          findMany: jest.fn().mockResolvedValue([enrichedRow()]),
          count: jest.fn().mockResolvedValue(1),
        },
        building: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: buildingId, name: 'Al Manar' }]),
        },
      });

      const [row] = (await service.findAll(orgId, callerId, Role.ORG_ADMIN, {}))
        .items;

      expect(row).toEqual(
        expect.objectContaining({
          id: 'payment-1',
          amount: '500.00',
          method: 'cash',
          leaseId: 'lease-1',
          renterId: 'renter-1',
          renterName: 'Sara Haddad',
          buildingId,
          buildingName: 'Al Manar',
          apartmentUnitNumber: 'G-01',
          invoiceTotalAmount: '1000.00',
          invoicePaidAmount: '500.00',
          invoiceStatus: 'partially_paid',
        }),
      );
    });

    it('falls back to the building id when the building name cannot be resolved', async () => {
      const { service } = makeService({
        invoicePayment: {
          findMany: jest.fn().mockResolvedValue([enrichedRow()]),
          count: jest.fn().mockResolvedValue(1),
        },
      });

      const [row] = (await service.findAll(orgId, callerId, Role.ORG_ADMIN, {}))
        .items;

      expect(row.buildingName).toBe(buildingId);
    });

    it('applies method, renter, date-range and free-text filters', async () => {
      const { service, prisma } = makeService();

      await service.findAll(orgId, callerId, Role.ORG_ADMIN, {
        method: 'bank_transfer',
        renterId: 'renter-9',
        from: '2026-01-01',
        to: '2026-01-31',
        q: 'sara',
      });

      const { where } = prisma.invoicePayment.findMany.mock.calls[0][0];
      expect(where.method).toBe('bank_transfer');
      expect(where.invoice).toEqual({ lease: { renterId: 'renter-9' } });
      expect(where.paidAt).toEqual({
        gte: new Date('2026-01-01'),
        lte: new Date('2026-01-31'),
      });
      expect(where.OR).toHaveLength(3);
    });

    it('narrows an out-of-scope building filter to nothing for a supervisor', async () => {
      const { service, prisma } = makeService({
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue([buildingId]),
        },
      });

      await service.findAll(orgId, callerId, Role.SUPERVISOR, {
        buildingId: 'building-not-mine',
      });

      const { where } = prisma.invoicePayment.findMany.mock.calls[0][0];
      expect(where.invoice).toEqual({ buildingId: { in: [] } });
    });

    it('honours an in-scope building filter for a supervisor', async () => {
      const { service, prisma } = makeService({
        buildingAccess: {
          getAllowedBuildingIds: jest
            .fn()
            .mockResolvedValue([buildingId, 'building-2']),
        },
      });

      await service.findAll(orgId, callerId, Role.SUPERVISOR, { buildingId });

      const { where } = prisma.invoicePayment.findMany.mock.calls[0][0];
      expect(where.invoice).toEqual({ buildingId });
    });

    it('keeps the building scope alongside a free-text search (OR must not widen it)', async () => {
      const { service, prisma } = makeService({
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue([buildingId]),
        },
      });

      await service.findAll(orgId, callerId, Role.SUPERVISOR, { q: 'cash' });

      const { where } = prisma.invoicePayment.findMany.mock.calls[0][0];
      // top-level `invoice` and `OR` are ANDed by Prisma → scope survives
      expect(where.invoice).toEqual({ buildingId: { in: [buildingId] } });
      expect(where.OR).toHaveLength(3);
    });

    it('rejects an unknown payment method', async () => {
      const { service } = makeService();

      await expect(
        service.findAll(orgId, callerId, Role.ORG_ADMIN, { method: 'crypto' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an inverted date range', async () => {
      const { service } = makeService();

      await expect(
        service.findAll(orgId, callerId, Role.ORG_ADMIN, {
          from: '2026-03-01',
          to: '2026-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unparseable date', async () => {
      const { service } = makeService();

      await expect(
        service.findAll(orgId, callerId, Role.ORG_ADMIN, {
          from: 'not-a-date',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('summary', () => {
    const now = new Date('2026-02-15T00:00:00.000Z');

    it('totals collected, MTD and the per-method breakdown', async () => {
      const { service } = makeService({
        invoicePayment: {
          aggregate: jest
            .fn()
            .mockResolvedValueOnce({
              _sum: { amount: decimal('1500.00') },
              _count: { _all: 3 },
            })
            .mockResolvedValueOnce({
              _sum: { amount: decimal('500.00') },
              _count: { _all: 1 },
            }),
          groupBy: jest.fn().mockResolvedValue([
            {
              method: 'cash',
              _sum: { amount: decimal('400.00') },
              _count: { _all: 1 },
            },
            {
              method: 'bank_transfer',
              _sum: { amount: decimal('1100.00') },
              _count: { _all: 2 },
            },
          ]),
        },
      });

      const { data } = await service.summary(
        orgId,
        callerId,
        Role.FINANCE,
        {},
        now,
      );

      expect(data.totalCollected).toBe('1500.00');
      expect(data.count).toBe(3);
      expect(data.mtdCollected).toBe('500.00');
      expect(data.mtdCount).toBe(1);
      // sorted by amount desc
      expect(data.byMethod.map((m) => m.method)).toEqual([
        'bank_transfer',
        'cash',
      ]);
      expect(data.byMethod[0]).toEqual({
        method: 'bank_transfer',
        amount: '1100.00',
        count: 2,
      });
    });

    it('sums only unpaid balances into outstandingTotal', async () => {
      const { service } = makeService({
        invoice: {
          findMany: jest.fn().mockResolvedValue([
            // 1000 billed, 400 paid → 600 outstanding
            {
              dueDate: new Date('2026-03-01T00:00:00.000Z'),
              lineItems: [{ amount: decimal('1000.00') }],
              payments: [{ amount: decimal('400.00') }],
            },
            // fully settled → contributes nothing
            {
              dueDate: new Date('2026-03-01T00:00:00.000Z'),
              lineItems: [{ amount: decimal('800.00') }],
              payments: [{ amount: decimal('800.00') }],
            },
          ]),
        },
      });

      const { data } = await service.summary(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        {},
        now,
      );

      expect(data.outstandingTotal).toBe('600.00');
      expect(data.outstandingInvoices).toBe(1);
    });

    it('computes MTD from the current UTC month regardless of the picked range', async () => {
      const { service, prisma } = makeService();

      await service.summary(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        { from: '2025-01-01', to: '2025-12-31' },
        now,
      );

      const mtdWhere = prisma.invoicePayment.aggregate.mock.calls[1][0].where;
      expect(mtdWhere.paidAt).toEqual({
        gte: new Date('2026-02-01T00:00:00.000Z'),
      });
    });

    it('scopes the outstanding balance to a supervisor allowed buildings', async () => {
      const { service, prisma } = makeService({
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue([buildingId]),
        },
      });

      await service.summary(orgId, callerId, Role.SUPERVISOR, {}, now);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            orgId,
            buildingId: { in: [buildingId] },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException for a payment in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.findOne(orgId, callerId, Role.ORG_ADMIN, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException for a supervisor not assigned to the building', async () => {
      const { service } = makeService({
        invoicePayment: {
          findFirst: jest.fn().mockResolvedValue({
            ...paymentRow(),
            invoice: { buildingId },
          }),
        },
        buildingAccess: {
          assertBuildingAccess: jest
            .fn()
            .mockRejectedValue(new ForbiddenException()),
        },
      });

      await expect(
        service.findOne(orgId, callerId, Role.SUPERVISOR, 'payment-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('create', () => {
    const dto = {
      invoiceId: 'invoice-1',
      amount: 500,
      method: 'cash' as const,
      paidAt: '2026-02-01',
      notes: undefined,
    };

    it('succeeds with a valid invoice/amount/method/paidAt and recomputes the invoice summary', async () => {
      const { service, prisma, timeline } = makeService({
        invoice: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce({
              id: 'invoice-1',
              lease: { renter: { renterUserId: null } },
            })
            .mockResolvedValueOnce(invoiceForSummary()),
        },
        invoicePayment: {
          create: jest.fn().mockResolvedValue(paymentRow()),
        },
      });

      const result = await service.create(orgId, callerId, Role.ORG_ADMIN, dto);

      expect(prisma.invoicePayment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceId: 'invoice-1',
            amount: 500,
          }),
        }),
      );
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'invoice_payment.created' }),
      );
      expect(result.data.payment.id).toBe('payment-1');
      expect(result.data.invoice).toEqual({
        totalAmount: '1000.00',
        paidAmount: '500.00',
        status: 'partially_paid',
      });
    });

    it('rejects when a required field is missing', async () => {
      const { service } = makeService();

      await expect(
        service.create(orgId, callerId, Role.ORG_ADMIN, {
          ...dto,
          amount: undefined,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when the invoice does not exist / belongs to another org', async () => {
      const { service } = makeService({
        invoice: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.create(orgId, callerId, Role.ORG_ADMIN, dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a supervisor caller', async () => {
      const { service } = makeService();

      await expect(
        service.create(orgId, callerId, Role.SUPERVISOR, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    describe('tenant notification (F5.1)', () => {
      it('notifies the tenant when the invoice lease renter has a linked portal user', async () => {
        const { service, notifications } = makeService({
          invoice: {
            findFirst: jest
              .fn()
              .mockResolvedValueOnce({
                id: 'invoice-1',
                lease: { renter: { renterUserId: 'tenant-user-1' } },
              })
              .mockResolvedValueOnce(invoiceForSummary()),
          },
          invoicePayment: {
            create: jest.fn().mockResolvedValue(paymentRow()),
          },
        });

        await service.create(orgId, callerId, Role.ORG_ADMIN, dto);

        expect(notifications.enqueue).toHaveBeenCalledTimes(1);
        expect(notifications.enqueue).toHaveBeenCalledWith(
          expect.objectContaining({
            orgId,
            userId: 'tenant-user-1',
            type: 'invoice.payment_recorded',
          }),
        );
      });

      it('does not notify when the renter has no linked portal user', async () => {
        const { service, notifications } = makeService({
          invoice: {
            findFirst: jest
              .fn()
              .mockResolvedValueOnce({
                id: 'invoice-1',
                lease: { renter: { renterUserId: null } },
              })
              .mockResolvedValueOnce(invoiceForSummary()),
          },
          invoicePayment: {
            create: jest.fn().mockResolvedValue(paymentRow()),
          },
        });

        await service.create(orgId, callerId, Role.ORG_ADMIN, dto);

        expect(notifications.enqueue).not.toHaveBeenCalled();
      });
    });
  });

  describe('remove', () => {
    it('deletes the payment and recomputes the invoice summary', async () => {
      const { service, prisma, timeline } = makeService({
        invoicePayment: {
          findFirst: jest.fn().mockResolvedValue(paymentRow()),
        },
        invoice: {
          findFirst: jest
            .fn()
            .mockResolvedValue(invoiceForSummary({ payments: [] })),
        },
      });

      const result = await service.remove(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        'payment-1',
      );

      expect(prisma.invoicePayment.delete).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'invoice_payment.deleted' }),
      );
      expect(result.data.invoice).toEqual({
        totalAmount: '1000.00',
        paidAmount: '0.00',
        status: 'open',
      });
    });

    it('throws NotFoundException for a payment outside the org', async () => {
      const { service } = makeService();

      await expect(
        service.remove(orgId, callerId, Role.ORG_ADMIN, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects a supervisor caller', async () => {
      const { service } = makeService({
        invoicePayment: {
          findFirst: jest.fn().mockResolvedValue(paymentRow()),
        },
      });

      await expect(
        service.remove(orgId, callerId, Role.SUPERVISOR, 'payment-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
