import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { WorkOrdersService } from './work-orders.service';
import { Role } from '@/common/enums';

describe('WorkOrdersService', () => {
  const orgId = 'org-1';
  const callerId = 'caller-1';
  const buildingId = 'building-1';
  const maintenanceRequestId = 'mr-1';

  function makeService(
    overrides: {
      maintenanceRequest?: Partial<Record<string, jest.Mock>>;
      workOrder?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      maintenanceRequest: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: maintenanceRequestId, orgId, buildingId }),
        ...overrides.maintenanceRequest,
      },
      workOrder: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.workOrder,
      },
    };
    const buildingAccess = {
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      ...overrides.buildingAccess,
    };
    const service = new WorkOrdersService(prisma, buildingAccess as any);
    return { service, prisma, buildingAccess };
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
});
