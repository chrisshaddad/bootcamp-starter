import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { WorkOrdersService } from './work-orders.service';
import { Role } from '@/common/enums';

describe('WorkOrdersService', () => {
  const orgId = 'org-1';
  const callerId = 'caller-1';
  const actorId = 'actor-1';
  const buildingId = 'building-1';
  const apartmentId = 'apartment-1';
  const maintenanceRequestId = 'mr-1';

  function makeService(
    overrides: {
      maintenanceRequest?: Partial<Record<string, jest.Mock>>;
      workOrder?: Partial<Record<string, jest.Mock>>;
      expense?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
      workOrderApartmentStatus?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      maintenanceRequest: {
        findFirst: jest.fn().mockResolvedValue({
          id: maintenanceRequestId,
          orgId,
          buildingId,
          apartmentId,
        }),
        ...overrides.maintenanceRequest,
      },
      workOrder: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.workOrder,
      },
      expense: {
        count: jest.fn().mockResolvedValue(0),
        ...overrides.expense,
      },
    };
    const buildingAccess = {
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      ...overrides.buildingAccess,
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const workOrderApartmentStatus = {
      onWorkOrderOpened: jest.fn().mockResolvedValue(undefined),
      onWorkOrderClosed: jest.fn().mockResolvedValue(undefined),
      ...overrides.workOrderApartmentStatus,
    };
    const service = new WorkOrdersService(
      prisma,
      buildingAccess as any,
      timeline as any,
      workOrderApartmentStatus as any,
    );
    return {
      service,
      prisma,
      buildingAccess,
      timeline,
      workOrderApartmentStatus,
    };
  }

  const workOrderRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'wo-1',
    orgId,
    maintenanceRequestId,
    vendorId: 'vendor-1',
    assignedUserId: null,
    status: 'scheduled',
    cost: new Prisma.Decimal('150.00'),
    resolutionNotes: null,
    completedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  describe('findAllForRequest', () => {
    it('returns only work orders for the given request within the caller org', async () => {
      const { service, prisma, buildingAccess } = makeService({
        workOrder: { findMany: jest.fn().mockResolvedValue([workOrderRow()]) },
      });

      const result = await service.findAllForRequest(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        maintenanceRequestId,
      );

      expect(prisma.maintenanceRequest.findFirst).toHaveBeenCalledWith({
        where: { id: maintenanceRequestId, orgId },
        select: { buildingId: true },
      });
      expect(buildingAccess.assertBuildingAccess).toHaveBeenCalledWith(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        buildingId,
      );
      expect(prisma.workOrder.findMany).toHaveBeenCalledWith({
        where: { maintenanceRequestId, orgId },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([
        expect.objectContaining({ id: 'wo-1', vendorId: 'vendor-1' }),
      ]);
    });

    it('throws NotFoundException for a maintenance request in a different org', async () => {
      const { service } = makeService({
        maintenanceRequest: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.findAllForRequest(orgId, callerId, Role.ORG_ADMIN, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when a building-scoped caller is not assigned to the request building', async () => {
      const { service } = makeService({
        buildingAccess: {
          assertBuildingAccess: jest
            .fn()
            .mockRejectedValue(new ForbiddenException()),
        },
      });

      await expect(
        service.findAllForRequest(
          orgId,
          callerId,
          Role.SUPERVISOR,
          maintenanceRequestId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('returns the work order when it belongs to the caller org and request', async () => {
      const { service, prisma, buildingAccess } = makeService({
        workOrder: {
          findFirst: jest.fn().mockResolvedValue({
            ...workOrderRow(),
            maintenanceRequest: { buildingId },
          }),
        },
      });

      const result = await service.findOne(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        maintenanceRequestId,
        'wo-1',
      );

      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { id: 'wo-1', orgId, maintenanceRequestId },
        include: { maintenanceRequest: { select: { buildingId: true } } },
      });
      expect(buildingAccess.assertBuildingAccess).toHaveBeenCalledWith(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        buildingId,
      );
      expect(result.data).toEqual(expect.objectContaining({ id: 'wo-1' }));
    });

    it('throws NotFoundException for a work order in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.findOne(
          orgId,
          callerId,
          Role.ORG_ADMIN,
          maintenanceRequestId,
          'missing',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException for a work order under a different maintenance request', async () => {
      const { service, prisma } = makeService();

      await expect(
        service.findOne(
          orgId,
          callerId,
          Role.ORG_ADMIN,
          'other-request',
          'wo-1',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
        where: { id: 'wo-1', orgId, maintenanceRequestId: 'other-request' },
        include: { maintenanceRequest: { select: { buildingId: true } } },
      });
    });

    it('throws ForbiddenException when a building-scoped caller is not assigned to the request building', async () => {
      const { service } = makeService({
        workOrder: {
          findFirst: jest.fn().mockResolvedValue({
            ...workOrderRow(),
            maintenanceRequest: { buildingId },
          }),
        },
        buildingAccess: {
          assertBuildingAccess: jest
            .fn()
            .mockRejectedValue(new ForbiddenException()),
        },
      });

      await expect(
        service.findOne(
          orgId,
          callerId,
          Role.SUPERVISOR,
          maintenanceRequestId,
          'wo-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('create', () => {
    it('creates a work order with a vendor assigned, opens the apartment, and emits work_order.created', async () => {
      const { service, prisma, timeline, workOrderApartmentStatus } =
        makeService();
      prisma.workOrder.create.mockResolvedValue(
        workOrderRow({ vendorId: 'vendor-1', assignedUserId: null }),
      );

      await service.create(
        orgId,
        actorId,
        Role.ORG_ADMIN,
        maintenanceRequestId,
        {
          vendorId: 'vendor-1',
        },
      );

      expect(prisma.workOrder.create).toHaveBeenCalledWith({
        data: {
          orgId,
          maintenanceRequestId,
          vendorId: 'vendor-1',
          assignedUserId: undefined,
          status: undefined,
          cost: undefined,
          resolutionNotes: undefined,
        },
      });
      expect(workOrderApartmentStatus.onWorkOrderOpened).toHaveBeenCalledWith(
        apartmentId,
      );
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'work_order.created' }),
      );
    });

    it('creates a work order with a staff member assigned', async () => {
      const { service, prisma } = makeService();
      prisma.workOrder.create.mockResolvedValue(
        workOrderRow({ vendorId: null, assignedUserId: 'user-1' }),
      );

      const result = await service.create(
        orgId,
        actorId,
        Role.ORG_ADMIN,
        maintenanceRequestId,
        { assignedUserId: 'user-1' },
      );

      expect(result.data.assignedUserId).toBe('user-1');
    });

    it('rejects with BadRequestException when both vendorId and assignedUserId are set', async () => {
      const { service } = makeService();

      await expect(
        service.create(orgId, actorId, Role.ORG_ADMIN, maintenanceRequestId, {
          vendorId: 'vendor-1',
          assignedUserId: 'user-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects with BadRequestException when neither vendorId nor assignedUserId is set', async () => {
      const { service } = makeService();

      await expect(
        service.create(
          orgId,
          actorId,
          Role.ORG_ADMIN,
          maintenanceRequestId,
          {},
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects with ForbiddenException for a maintenance-role caller', async () => {
      const { service } = makeService();

      await expect(
        service.create(orgId, actorId, Role.MAINTENANCE, maintenanceRequestId, {
          vendorId: 'vendor-1',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException for a maintenance request in a different org', async () => {
      const { service } = makeService({
        maintenanceRequest: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.create(orgId, actorId, Role.ORG_ADMIN, 'missing', {
          vendorId: 'vendor-1',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    const existingRow = () => ({
      ...workOrderRow(),
      maintenanceRequest: { apartmentId },
    });

    it('org_admin can reassign from a vendor to a staff member', async () => {
      const { service, prisma, timeline } = makeService({
        workOrder: { findFirst: jest.fn().mockResolvedValue(existingRow()) },
      });
      prisma.workOrder.update.mockResolvedValue(
        workOrderRow({ vendorId: null, assignedUserId: 'user-1' }),
      );

      await service.update(
        orgId,
        actorId,
        callerId,
        Role.ORG_ADMIN,
        maintenanceRequestId,
        'wo-1',
        { assignedUserId: 'user-1' },
      );

      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        data: { vendorId: null, assignedUserId: 'user-1' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'work_order.updated' }),
      );
    });

    it('rejects reassignment ambiguity when both vendorId and assignedUserId are provided', async () => {
      const { service } = makeService({
        workOrder: { findFirst: jest.fn().mockResolvedValue(existingRow()) },
      });

      await expect(
        service.update(
          orgId,
          actorId,
          callerId,
          Role.ORG_ADMIN,
          maintenanceRequestId,
          'wo-1',
          { vendorId: 'vendor-2', assignedUserId: 'user-1' },
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('calls onWorkOrderClosed when status transitions into completed and auto-stamps completedAt', async () => {
      const { service, prisma, workOrderApartmentStatus } = makeService({
        workOrder: { findFirst: jest.fn().mockResolvedValue(existingRow()) },
      });
      prisma.workOrder.update.mockResolvedValue(
        workOrderRow({ status: 'completed' }),
      );

      await service.update(
        orgId,
        actorId,
        callerId,
        Role.ORG_ADMIN,
        maintenanceRequestId,
        'wo-1',
        { status: 'completed' },
      );

      expect(workOrderApartmentStatus.onWorkOrderClosed).toHaveBeenCalledWith(
        apartmentId,
      );
      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        data: { status: 'completed', completedAt: expect.any(Date) },
      });
    });

    it('calls onWorkOrderOpened when status transitions from completed back to scheduled', async () => {
      const { service, prisma, workOrderApartmentStatus } = makeService({
        workOrder: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ ...existingRow(), status: 'completed' }),
        },
      });
      prisma.workOrder.update.mockResolvedValue(
        workOrderRow({ status: 'scheduled' }),
      );

      await service.update(
        orgId,
        actorId,
        callerId,
        Role.ORG_ADMIN,
        maintenanceRequestId,
        'wo-1',
        { status: 'scheduled' },
      );

      expect(workOrderApartmentStatus.onWorkOrderOpened).toHaveBeenCalledWith(
        apartmentId,
      );
    });

    it('allows a maintenance caller to update status/resolutionNotes on their own assigned work order', async () => {
      const { service, prisma } = makeService({
        workOrder: {
          findFirst: jest.fn().mockResolvedValue({
            ...existingRow(),
            vendorId: null,
            assignedUserId: callerId,
          }),
        },
      });
      prisma.workOrder.update.mockResolvedValue(
        workOrderRow({ status: 'in_progress' }),
      );

      await service.update(
        orgId,
        actorId,
        callerId,
        Role.MAINTENANCE,
        maintenanceRequestId,
        'wo-1',
        { status: 'in_progress', resolutionNotes: 'On my way' },
      );

      expect(prisma.workOrder.update).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        data: { status: 'in_progress', resolutionNotes: 'On my way' },
      });
    });

    it('rejects a maintenance caller updating a work order assigned to someone else', async () => {
      const { service } = makeService({
        workOrder: {
          findFirst: jest.fn().mockResolvedValue({
            ...existingRow(),
            vendorId: null,
            assignedUserId: 'someone-else',
          }),
        },
      });

      await expect(
        service.update(
          orgId,
          actorId,
          callerId,
          Role.MAINTENANCE,
          maintenanceRequestId,
          'wo-1',
          { status: 'in_progress' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a maintenance caller attempting to reassign even on their own work order', async () => {
      const { service } = makeService({
        workOrder: {
          findFirst: jest.fn().mockResolvedValue({
            ...existingRow(),
            vendorId: null,
            assignedUserId: callerId,
          }),
        },
      });

      await expect(
        service.update(
          orgId,
          actorId,
          callerId,
          Role.MAINTENANCE,
          maintenanceRequestId,
          'wo-1',
          { vendorId: 'vendor-2' },
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException for a work order in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.update(
          orgId,
          actorId,
          callerId,
          Role.ORG_ADMIN,
          maintenanceRequestId,
          'missing',
          { status: 'in_progress' },
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the work order, reverts the apartment via onWorkOrderClosed, and emits work_order.deleted', async () => {
      const { service, prisma, timeline, workOrderApartmentStatus } =
        makeService({
          workOrder: {
            findFirst: jest.fn().mockResolvedValue({
              ...workOrderRow(),
              maintenanceRequest: { apartmentId },
            }),
          },
        });

      await service.remove(
        orgId,
        actorId,
        Role.ORG_ADMIN,
        maintenanceRequestId,
        'wo-1',
      );

      expect(prisma.workOrder.delete).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
      });
      expect(workOrderApartmentStatus.onWorkOrderClosed).toHaveBeenCalledWith(
        apartmentId,
      );
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'work_order.deleted' }),
      );
    });

    it('rejects with ForbiddenException for a maintenance-role caller', async () => {
      const { service } = makeService({
        workOrder: {
          findFirst: jest.fn().mockResolvedValue({
            ...workOrderRow(),
            maintenanceRequest: { apartmentId },
          }),
        },
      });

      await expect(
        service.remove(
          orgId,
          actorId,
          Role.MAINTENANCE,
          maintenanceRequestId,
          'wo-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws NotFoundException for a work order in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.remove(
          orgId,
          actorId,
          Role.ORG_ADMIN,
          maintenanceRequestId,
          'missing',
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ConflictException when an expense references the work order', async () => {
      const { service, prisma } = makeService({
        workOrder: {
          findFirst: jest.fn().mockResolvedValue({
            ...workOrderRow(),
            maintenanceRequest: { apartmentId },
          }),
        },
        expense: { count: jest.fn().mockResolvedValue(1) },
      });

      await expect(
        service.remove(
          orgId,
          actorId,
          Role.ORG_ADMIN,
          maintenanceRequestId,
          'wo-1',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.workOrder.delete).not.toHaveBeenCalled();
    });
  });
});
