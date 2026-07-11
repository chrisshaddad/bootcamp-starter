import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Role } from '@/common/enums';

describe('ExpensesService', () => {
  const orgId = 'org-1';
  const callerId = 'caller-1';
  const buildingId = 'building-1';

  function makeService(
    overrides: {
      expense?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      expense: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.expense,
      },
    };
    const buildingAccess = {
      getAllowedBuildingIds: jest.fn().mockResolvedValue(null),
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      ...overrides.buildingAccess,
    };
    const service = new ExpensesService(prisma, buildingAccess as any);
    return { service, prisma, buildingAccess };
  }

  const expenseRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'expense-1',
    orgId,
    buildingId,
    vendorId: null,
    workOrderId: null,
    category: 'repairs',
    amount: { toString: () => '150.00' },
    incurredAt: new Date('2026-01-05T00:00:00.000Z'),
    notes: null,
    createdAt: new Date('2026-01-05T00:00:00.000Z'),
    updatedAt: new Date('2026-01-05T00:00:00.000Z'),
    ...overrides,
  });

  describe('findAll', () => {
    it('returns all org expenses for an org-wide role (org_admin)', async () => {
      const { service, prisma, buildingAccess } = makeService({
        expense: { findMany: jest.fn().mockResolvedValue([expenseRow()]) },
      });

      const result = await service.findAll(orgId, callerId, Role.ORG_ADMIN);

      expect(buildingAccess.getAllowedBuildingIds).toHaveBeenCalledWith(
        orgId,
        callerId,
        Role.ORG_ADMIN,
      );
      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { orgId },
        orderBy: { incurredAt: 'desc' },
      });
      expect(result.data).toEqual([
        expect.objectContaining({
          id: 'expense-1',
          category: 'repairs',
          amount: '150.00',
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
      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { orgId },
        orderBy: { incurredAt: 'desc' },
      });
    });

    it('filters to allowed building ids and excludes org-wide expenses for a supervisor', async () => {
      const { service, prisma } = makeService({
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue([buildingId]),
        },
      });

      await service.findAll(orgId, callerId, Role.SUPERVISOR);

      expect(prisma.expense.findMany).toHaveBeenCalledWith({
        where: { orgId, buildingId: { in: [buildingId] } },
        orderBy: { incurredAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('returns the expense when it belongs to the caller org', async () => {
      const { service, prisma } = makeService({
        expense: { findFirst: jest.fn().mockResolvedValue(expenseRow()) },
      });

      const result = await service.findOne(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        'expense-1',
      );

      expect(prisma.expense.findFirst).toHaveBeenCalledWith({
        where: { id: 'expense-1', orgId },
      });
      expect(result.data).toEqual(expect.objectContaining({ id: 'expense-1' }));
    });

    it('throws NotFoundException for an expense in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.findOne(orgId, callerId, Role.ORG_ADMIN, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when a supervisor requests an org-wide (no building) expense', async () => {
      const { service } = makeService({
        expense: {
          findFirst: jest
            .fn()
            .mockResolvedValue(expenseRow({ buildingId: null })),
        },
      });

      await expect(
        service.findOne(orgId, callerId, Role.SUPERVISOR, 'expense-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows a supervisor assigned to the building to view a building-scoped expense', async () => {
      const { service, buildingAccess } = makeService({
        expense: { findFirst: jest.fn().mockResolvedValue(expenseRow()) },
      });

      await service.findOne(orgId, callerId, Role.SUPERVISOR, 'expense-1');

      expect(buildingAccess.assertBuildingAccess).toHaveBeenCalledWith(
        orgId,
        callerId,
        Role.SUPERVISOR,
        buildingId,
      );
    });
  });
});
