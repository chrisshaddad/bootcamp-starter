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
      buildingAccess?: Partial<Record<string, jest.Mock>>;
      notifications?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      invoicePayment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        delete: jest.fn(),
        ...overrides.invoicePayment,
      },
      invoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        ...overrides.invoice,
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

  describe('findAll', () => {
    it('sees the full org for a finance caller', async () => {
      const { service, prisma, buildingAccess } = makeService({
        invoicePayment: {
          findMany: jest.fn().mockResolvedValue([paymentRow()]),
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

      await service.findAll(orgId, callerId, Role.ORG_ADMIN, 'invoice-1');

      expect(prisma.invoicePayment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId, invoiceId: 'invoice-1' },
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
