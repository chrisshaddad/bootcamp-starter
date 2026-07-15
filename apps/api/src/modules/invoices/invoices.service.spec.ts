import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Role } from '@/common/enums';

describe('InvoicesService', () => {
  const orgId = 'org-1';
  const callerId = 'caller-1';
  const buildingId = 'building-1';

  function makeService(
    overrides: {
      invoice?: Partial<Record<string, jest.Mock>>;
      lease?: Partial<Record<string, jest.Mock>>;
      invoiceLineItem?: Partial<Record<string, jest.Mock>>;
      invoicePayment?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      invoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.invoice,
      },
      lease: {
        findFirst: jest.fn().mockResolvedValue(null),
        ...overrides.lease,
      },
      invoiceLineItem: {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        ...overrides.invoiceLineItem,
      },
      invoicePayment: {
        count: jest.fn().mockResolvedValue(0),
        ...overrides.invoicePayment,
      },
    };
    prisma.$transaction = jest.fn(async (cb: (tx: unknown) => unknown) =>
      cb(prisma),
    );
    const buildingAccess = {
      getAllowedBuildingIds: jest.fn().mockResolvedValue(null),
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      ...overrides.buildingAccess,
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const service = new InvoicesService(
      prisma,
      buildingAccess as any,
      timeline as any,
    );
    return { service, prisma, buildingAccess, timeline };
  }

  const decimal = (value: string) => ({
    toString: () => value,
    toNumber: () => Number(value),
  });

  const invoiceRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'invoice-1',
    orgId,
    buildingId,
    leaseId: 'lease-1',
    dueDate: new Date('2099-02-01T00:00:00.000Z'),
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    lineItems: [
      {
        id: 'li-1',
        invoiceId: 'invoice-1',
        category: 'rent',
        description: null,
        amount: decimal('1000.00'),
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ],
    payments: [],
    lease: {
      renter: { fullName: 'Jane Tenant' },
      apartment: { unitNumber: '101' },
    },
    ...overrides,
  });

  describe('findAll', () => {
    it('returns invoices with computed totalAmount/paidAmount/status for an org-wide role', async () => {
      const { service, prisma, buildingAccess } = makeService({
        invoice: { findMany: jest.fn().mockResolvedValue([invoiceRow()]) },
      });

      const result = await service.findAll(orgId, callerId, Role.ORG_ADMIN);

      expect(buildingAccess.getAllowedBuildingIds).toHaveBeenCalledWith(
        orgId,
        callerId,
        Role.ORG_ADMIN,
      );
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId } }),
      );
      expect(result.data).toEqual([
        expect.objectContaining({
          id: 'invoice-1',
          leaseId: 'lease-1',
          totalAmount: '1000.00',
          paidAmount: '0.00',
          status: 'open',
          renterName: 'Jane Tenant',
          apartmentUnitNumber: '101',
        }),
      ]);
    });

    it('sees the full org regardless of building for a finance caller', async () => {
      const { service, prisma, buildingAccess } = makeService();

      await service.findAll(orgId, callerId, Role.FINANCE);

      expect(buildingAccess.getAllowedBuildingIds).toHaveBeenCalledWith(
        orgId,
        callerId,
        Role.FINANCE,
      );
      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
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

      expect(prisma.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId, buildingId: { in: [buildingId] } },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the invoice when it belongs to the caller org', async () => {
      const { service, prisma } = makeService({
        invoice: { findFirst: jest.fn().mockResolvedValue(invoiceRow()) },
      });

      const result = await service.findOne(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        'invoice-1',
      );

      expect(prisma.invoice.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'invoice-1', orgId } }),
      );
      expect(result.data).toEqual(expect.objectContaining({ id: 'invoice-1' }));
    });

    it('throws NotFoundException for an invoice in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.findOne(orgId, callerId, Role.ORG_ADMIN, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException for a supervisor not assigned to the building', async () => {
      const { service } = makeService({
        invoice: { findFirst: jest.fn().mockResolvedValue(invoiceRow()) },
        buildingAccess: {
          assertBuildingAccess: jest
            .fn()
            .mockRejectedValue(new ForbiddenException()),
        },
      });

      await expect(
        service.findOne(orgId, callerId, Role.SUPERVISOR, 'invoice-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('create', () => {
    const dto = {
      leaseId: 'lease-1',
      dueDate: '2099-02-01',
      notes: undefined,
      lineItems: [{ category: 'rent' as const, amount: 1000 }],
    };

    it('creates an invoice with the denormalized buildingId from the lease', async () => {
      const { service, prisma, timeline } = makeService({
        lease: {
          findFirst: jest.fn().mockResolvedValue({ id: 'lease-1', buildingId }),
        },
        invoice: { create: jest.fn().mockResolvedValue(invoiceRow()) },
      });

      const result = await service.create(orgId, callerId, Role.ORG_ADMIN, dto);

      expect(prisma.invoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId,
            buildingId,
            leaseId: 'lease-1',
          }),
        }),
      );
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'invoice.created' }),
      );
      expect(result.data.id).toBe('invoice-1');
    });

    it('rejects when line items are empty', async () => {
      const { service } = makeService({
        lease: {
          findFirst: jest.fn().mockResolvedValue({ id: 'lease-1', buildingId }),
        },
      });

      await expect(
        service.create(orgId, callerId, Role.ORG_ADMIN, {
          ...dto,
          lineItems: [],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects when a required field is missing', async () => {
      const { service } = makeService();

      await expect(
        service.create(orgId, callerId, Role.ORG_ADMIN, {
          ...dto,
          leaseId: '',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFoundException when the lease does not exist in the org', async () => {
      const { service } = makeService({
        lease: { findFirst: jest.fn().mockResolvedValue(null) },
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
  });

  describe('update', () => {
    it('replaces the line-item set wholesale when line items are provided', async () => {
      const { service, prisma, timeline } = makeService({
        invoice: {
          findFirst: jest.fn().mockResolvedValue(invoiceRow()),
          update: jest.fn().mockResolvedValue(invoiceRow()),
        },
      });

      await service.update(orgId, callerId, Role.FINANCE, 'invoice-1', {
        lineItems: [{ category: 'utilities', amount: 250 }],
      });

      expect(prisma.invoiceLineItem.deleteMany).toHaveBeenCalledWith({
        where: { invoiceId: 'invoice-1' },
      });
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            lineItems: { create: [expect.objectContaining({ amount: 250 })] },
          }),
        }),
      );
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'invoice.updated' }),
      );
    });

    it('patches dueDate/notes independently when line items are not provided', async () => {
      const { service, prisma } = makeService({
        invoice: {
          findFirst: jest.fn().mockResolvedValue(invoiceRow()),
          update: jest.fn().mockResolvedValue(invoiceRow()),
        },
      });

      await service.update(orgId, callerId, Role.ORG_ADMIN, 'invoice-1', {
        notes: 'updated notes',
      });

      expect(prisma.invoiceLineItem.deleteMany).not.toHaveBeenCalled();
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { notes: 'updated notes' },
        }),
      );
    });

    it('throws NotFoundException for an invoice outside the org', async () => {
      const { service } = makeService();

      await expect(
        service.update(orgId, callerId, Role.ORG_ADMIN, 'missing', {
          notes: 'x',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the invoice and its line items', async () => {
      const { service, prisma, timeline } = makeService({
        invoice: { findFirst: jest.fn().mockResolvedValue(invoiceRow()) },
      });

      await service.remove(orgId, callerId, Role.ORG_ADMIN, 'invoice-1');

      expect(prisma.invoice.delete).toHaveBeenCalledWith({
        where: { id: 'invoice-1' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'invoice.deleted' }),
      );
    });

    it('rejects a supervisor caller', async () => {
      const { service } = makeService({
        invoice: { findFirst: jest.fn().mockResolvedValue(invoiceRow()) },
      });

      await expect(
        service.remove(orgId, callerId, Role.SUPERVISOR, 'invoice-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects deletion when an InvoicePayment references the invoice', async () => {
      const { service, prisma } = makeService({
        invoice: { findFirst: jest.fn().mockResolvedValue(invoiceRow()) },
        invoicePayment: { count: jest.fn().mockResolvedValue(1) },
      });

      await expect(
        service.remove(orgId, callerId, Role.ORG_ADMIN, 'invoice-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.invoice.delete).not.toHaveBeenCalled();
    });
  });
});
