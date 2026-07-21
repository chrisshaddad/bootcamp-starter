import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { Role } from '@/common/enums';

describe('ExpensesService', () => {
  const orgId = 'org-1';
  const callerId = 'caller-1';
  const actorId = 'actor-1';
  const buildingId = 'building-1';

  function makeService(
    overrides: {
      expense?: Partial<Record<string, jest.Mock>>;
      workOrder?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      expense: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.expense,
      },
      workOrder: {
        findFirst: jest.fn().mockResolvedValue(null),
        ...overrides.workOrder,
      },
    };
    const buildingAccess = {
      getAllowedBuildingIds: jest.fn().mockResolvedValue(null),
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      ...overrides.buildingAccess,
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const service = new ExpensesService(
      prisma,
      buildingAccess as any,
      timeline as any,
    );
    return { service, prisma, buildingAccess, timeline };
  }

  const expenseRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'expense-1',
    orgId,
    buildingId,
    vendorId: null,
    workOrderId: null,
    workOrder: null,
    category: 'repairs',
    amount: { toString: () => '150.00' },
    incurredAt: new Date('2026-01-05T00:00:00.000Z'),
    notes: null,
    createdAt: new Date('2026-01-05T00:00:00.000Z'),
    updatedAt: new Date('2026-01-05T00:00:00.000Z'),
    ...overrides,
  });

  const WORK_ORDER_NUMBER_INCLUDE = {
    workOrder: { select: { number: true } },
  };

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
        include: WORK_ORDER_NUMBER_INCLUDE,
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
        include: WORK_ORDER_NUMBER_INCLUDE,
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
        include: WORK_ORDER_NUMBER_INCLUDE,
        orderBy: { incurredAt: 'desc' },
      });
    });

    it('populates workOrderNumberLabel for a row with a linked work order', async () => {
      const { service, prisma } = makeService({
        expense: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              expenseRow({ workOrderId: 'wo-1', workOrder: { number: 123 } }),
            ]),
        },
      });

      const result = await service.findAll(orgId, callerId, Role.ORG_ADMIN);

      expect(prisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ include: WORK_ORDER_NUMBER_INCLUDE }),
      );
      expect(result.data).toEqual([
        expect.objectContaining({
          workOrderId: 'wo-1',
          workOrderNumberLabel: 'WO-000123',
        }),
      ]);
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
        include: WORK_ORDER_NUMBER_INCLUDE,
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

  const createDto = {
    category: 'repairs' as const,
    amount: 150,
    incurredAt: '2026-01-05T00:00:00.000Z',
  };

  describe('create', () => {
    it('creates an expense with only required fields set and emits expense.created', async () => {
      const { service, prisma, timeline } = makeService();
      prisma.expense.create.mockResolvedValue(expenseRow());

      await service.create(orgId, actorId, Role.ORG_ADMIN, createDto);

      expect(prisma.expense.create).toHaveBeenCalledWith({
        data: {
          orgId,
          buildingId: undefined,
          vendorId: undefined,
          workOrderId: undefined,
          category: 'repairs',
          amount: 150,
          incurredAt: new Date('2026-01-05T00:00:00.000Z'),
          notes: undefined,
        },
        include: WORK_ORDER_NUMBER_INCLUDE,
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId,
          actorId,
          action: 'expense.created',
          targetType: 'Expense',
        }),
      );
    });

    it.each(['category', 'amount', 'incurredAt'])(
      'rejects with BadRequestException when %s is missing',
      async (field) => {
        const { service } = makeService();
        const dto: Record<string, unknown> = { ...createDto };
        delete dto[field];

        await expect(
          service.create(orgId, actorId, Role.ORG_ADMIN, dto as any),
        ).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('auto-fills vendorId from workOrderId when vendorId is omitted', async () => {
      const { service, prisma } = makeService({
        workOrder: {
          findFirst: jest.fn().mockResolvedValue({ vendorId: 'vendor-1' }),
        },
      });
      prisma.expense.create.mockResolvedValue(expenseRow());

      await service.create(orgId, actorId, Role.ORG_ADMIN, {
        ...createDto,
        workOrderId: 'wo-1',
      });

      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { id: 'wo-1', orgId },
        select: { vendorId: true },
      });
      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendorId: 'vendor-1',
            workOrderId: 'wo-1',
          }),
        }),
      );
    });

    it('rejects when vendorId and workOrderId are both provided but do not match', async () => {
      const { service } = makeService({
        workOrder: {
          findFirst: jest.fn().mockResolvedValue({ vendorId: 'vendor-1' }),
        },
      });

      await expect(
        service.create(orgId, actorId, Role.ORG_ADMIN, {
          ...createDto,
          workOrderId: 'wo-1',
          vendorId: 'vendor-2',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allows vendorId and workOrderId together when they match', async () => {
      const { service, prisma } = makeService({
        workOrder: {
          findFirst: jest.fn().mockResolvedValue({ vendorId: 'vendor-1' }),
        },
      });
      prisma.expense.create.mockResolvedValue(expenseRow());

      await service.create(orgId, actorId, Role.ORG_ADMIN, {
        ...createDto,
        workOrderId: 'wo-1',
        vendorId: 'vendor-1',
      });

      expect(prisma.expense.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendorId: 'vendor-1',
            workOrderId: 'wo-1',
          }),
        }),
      );
    });

    it('rejects with ForbiddenException for a supervisor caller', async () => {
      const { service } = makeService();

      await expect(
        service.create(orgId, actorId, Role.SUPERVISOR, createDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('allows a finance caller to create', async () => {
      const { service, prisma } = makeService();
      prisma.expense.create.mockResolvedValue(expenseRow());

      await expect(
        service.create(orgId, actorId, Role.FINANCE, createDto),
      ).resolves.toBeDefined();
    });
  });

  describe('update', () => {
    it('patches only the provided fields without clobbering others', async () => {
      const { service, prisma, timeline } = makeService({
        expense: { findFirst: jest.fn().mockResolvedValue(expenseRow()) },
      });
      prisma.expense.update.mockResolvedValue(
        expenseRow({ notes: 'Paid in full' }),
      );

      await service.update(orgId, actorId, Role.ORG_ADMIN, 'expense-1', {
        notes: 'Paid in full',
      });

      expect(prisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
        data: { notes: 'Paid in full' },
        include: WORK_ORDER_NUMBER_INCLUDE,
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'expense.updated' }),
      );
    });

    it('throws NotFoundException for an expense in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.update(orgId, actorId, Role.ORG_ADMIN, 'missing', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects with ForbiddenException for a supervisor caller', async () => {
      const { service } = makeService({
        expense: { findFirst: jest.fn().mockResolvedValue(expenseRow()) },
      });

      await expect(
        service.update(orgId, actorId, Role.SUPERVISOR, 'expense-1', {
          notes: 'x',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('deletes the expense and emits expense.deleted', async () => {
      const { service, prisma, timeline } = makeService({
        expense: { findFirst: jest.fn().mockResolvedValue(expenseRow()) },
      });

      await service.remove(orgId, actorId, Role.ORG_ADMIN, 'expense-1');

      expect(prisma.expense.delete).toHaveBeenCalledWith({
        where: { id: 'expense-1' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'expense.deleted' }),
      );
    });

    it('throws NotFoundException for an expense in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.remove(orgId, actorId, Role.ORG_ADMIN, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects with ForbiddenException for a supervisor caller', async () => {
      const { service } = makeService({
        expense: { findFirst: jest.fn().mockResolvedValue(expenseRow()) },
      });

      await expect(
        service.remove(orgId, actorId, Role.SUPERVISOR, 'expense-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
