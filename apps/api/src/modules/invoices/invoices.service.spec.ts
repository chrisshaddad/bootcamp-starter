import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Role } from '@/common/enums';

describe('InvoicesService', () => {
  const orgId = 'org-1';
  const callerId = 'caller-1';
  const buildingId = 'building-1';

  function makeService(
    overrides: {
      invoice?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      invoice: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.invoice,
      },
    };
    const buildingAccess = {
      getAllowedBuildingIds: jest.fn().mockResolvedValue(null),
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      ...overrides.buildingAccess,
    };
    const service = new InvoicesService(prisma, buildingAccess as any);
    return { service, prisma, buildingAccess };
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
      expect(result.data).toEqual(
        expect.objectContaining({ id: 'invoice-1' }),
      );
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
});
