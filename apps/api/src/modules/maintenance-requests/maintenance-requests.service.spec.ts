import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { Role } from '@/common/enums';

describe('MaintenanceRequestsService', () => {
  const orgId = 'org-1';
  const callerId = 'caller-1';
  const buildingId = 'building-1';

  function makeService(
    overrides: {
      maintenanceRequest?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      maintenanceRequest: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.maintenanceRequest,
      },
    };
    const buildingAccess = {
      getAllowedBuildingIds: jest.fn().mockResolvedValue(null),
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      ...overrides.buildingAccess,
    };
    const service = new MaintenanceRequestsService(
      prisma,
      buildingAccess as any,
    );
    return { service, prisma, buildingAccess };
  }

  const requestRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'mr-1',
    orgId,
    buildingId,
    apartmentId: 'apartment-1',
    renterId: 'renter-1',
    title: 'Leaky faucet',
    description: null,
    status: 'open',
    priority: 'medium',
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    apartment: { unitNumber: '101' },
    renter: { fullName: 'Jane Doe' },
    ...overrides,
  });

  describe('findAll', () => {
    it('returns only maintenance requests belonging to the caller org, org-wide role', async () => {
      const { service, prisma, buildingAccess } = makeService({
        maintenanceRequest: {
          findMany: jest.fn().mockResolvedValue([requestRow()]),
        },
      });

      const result = await service.findAll(orgId, callerId, Role.ORG_ADMIN);

      expect(buildingAccess.getAllowedBuildingIds).toHaveBeenCalledWith(
        orgId,
        callerId,
        Role.ORG_ADMIN,
      );
      expect(prisma.maintenanceRequest.findMany).toHaveBeenCalledWith({
        where: { orgId },
        include: {
          apartment: { select: { unitNumber: true } },
          renter: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([
        expect.objectContaining({
          id: 'mr-1',
          title: 'Leaky faucet',
          apartmentUnitNumber: '101',
          renterName: 'Jane Doe',
        }),
      ]);
    });

    it('filters to allowed building ids for a building-scoped role (supervisor/maintenance)', async () => {
      const { service, prisma } = makeService({
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue([buildingId]),
        },
      });

      await service.findAll(orgId, callerId, Role.MAINTENANCE);

      expect(prisma.maintenanceRequest.findMany).toHaveBeenCalledWith({
        where: { orgId, buildingId: { in: [buildingId] } },
        include: {
          apartment: { select: { unitNumber: true } },
          renter: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns no requests for a building-scoped caller with no assigned buildings', async () => {
      const { service, prisma } = makeService({
        buildingAccess: {
          getAllowedBuildingIds: jest.fn().mockResolvedValue([]),
        },
      });

      await service.findAll(orgId, callerId, Role.SUPERVISOR);

      expect(prisma.maintenanceRequest.findMany).toHaveBeenCalledWith({
        where: { orgId, buildingId: { in: [] } },
        include: {
          apartment: { select: { unitNumber: true } },
          renter: { select: { fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('returns the request when it belongs to the caller org and building', async () => {
      const { service, prisma, buildingAccess } = makeService({
        maintenanceRequest: {
          findFirst: jest.fn().mockResolvedValue(requestRow()),
        },
      });

      const result = await service.findOne(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        'mr-1',
      );

      expect(prisma.maintenanceRequest.findFirst).toHaveBeenCalledWith({
        where: { id: 'mr-1', orgId },
        include: {
          apartment: { select: { unitNumber: true } },
          renter: { select: { fullName: true } },
        },
      });
      expect(buildingAccess.assertBuildingAccess).toHaveBeenCalledWith(
        orgId,
        callerId,
        Role.ORG_ADMIN,
        buildingId,
      );
      expect(result.data).toEqual(
        expect.objectContaining({ id: 'mr-1', renterName: 'Jane Doe' }),
      );
    });

    it('throws NotFoundException for a request in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.findOne(orgId, callerId, Role.ORG_ADMIN, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ForbiddenException when a building-scoped caller is not assigned to the request building', async () => {
      const { service } = makeService({
        maintenanceRequest: {
          findFirst: jest.fn().mockResolvedValue(requestRow()),
        },
        buildingAccess: {
          assertBuildingAccess: jest
            .fn()
            .mockRejectedValue(new ForbiddenException()),
        },
      });

      await expect(
        service.findOne(orgId, callerId, Role.SUPERVISOR, 'mr-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
