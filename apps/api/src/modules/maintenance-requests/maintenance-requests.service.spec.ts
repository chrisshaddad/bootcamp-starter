import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { Role } from '@/common/enums';

describe('MaintenanceRequestsService', () => {
  const orgId = 'org-1';
  const callerId = 'caller-1';
  const actorId = 'actor-1';
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
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.maintenanceRequest,
      },
    };
    const buildingAccess = {
      getAllowedBuildingIds: jest.fn().mockResolvedValue(null),
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      ...overrides.buildingAccess,
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const service = new MaintenanceRequestsService(
      prisma,
      buildingAccess as any,
      timeline as any,
    );
    return { service, prisma, buildingAccess, timeline };
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

  const createDto = {
    buildingId,
    apartmentId: 'apartment-1',
    renterId: 'renter-1',
    title: 'Leaky faucet',
  };

  describe('create', () => {
    it('creates a maintenance request with only required fields set and emits maintenance_request.created', async () => {
      const { service, prisma, timeline } = makeService();
      prisma.maintenanceRequest.create.mockResolvedValue(requestRow());

      await service.create(orgId, actorId, Role.ORG_ADMIN, createDto);

      expect(prisma.maintenanceRequest.create).toHaveBeenCalledWith({
        data: {
          orgId,
          buildingId,
          apartmentId: 'apartment-1',
          renterId: 'renter-1',
          title: 'Leaky faucet',
          description: undefined,
          status: undefined,
          priority: undefined,
          notes: undefined,
        },
        include: {
          apartment: { select: { unitNumber: true } },
          renter: { select: { fullName: true } },
        },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId,
          actorId,
          action: 'maintenance_request.created',
          targetType: 'MaintenanceRequest',
        }),
      );
    });

    it.each(['buildingId', 'apartmentId', 'renterId', 'title'])(
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

    it('rejects with ForbiddenException for a maintenance-role caller', async () => {
      const { service } = makeService();

      await expect(
        service.create(orgId, actorId, Role.MAINTENANCE, createDto),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('update', () => {
    it('patches only the provided fields without clobbering others', async () => {
      const { service, prisma, timeline } = makeService({
        maintenanceRequest: {
          findFirst: jest.fn().mockResolvedValue(requestRow()),
        },
      });
      prisma.maintenanceRequest.update.mockResolvedValue(
        requestRow({ status: 'in_progress' }),
      );

      await service.update(orgId, actorId, Role.ORG_ADMIN, 'mr-1', {
        status: 'in_progress',
      });

      expect(prisma.maintenanceRequest.update).toHaveBeenCalledWith({
        where: { id: 'mr-1' },
        data: { status: 'in_progress' },
        include: {
          apartment: { select: { unitNumber: true } },
          renter: { select: { fullName: true } },
        },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'maintenance_request.updated' }),
      );
    });

    it('supports a status transition through to closed', async () => {
      const { service, prisma } = makeService({
        maintenanceRequest: {
          findFirst: jest.fn().mockResolvedValue(requestRow()),
        },
      });
      prisma.maintenanceRequest.update.mockResolvedValue(
        requestRow({ status: 'closed' }),
      );

      const result = await service.update(
        orgId,
        actorId,
        Role.ORG_ADMIN,
        'mr-1',
        { status: 'closed' },
      );

      expect(result.data.status).toBe('closed');
    });

    it('throws NotFoundException for a request in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.update(orgId, actorId, Role.ORG_ADMIN, 'missing', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects with ForbiddenException for a maintenance-role caller', async () => {
      const { service } = makeService({
        maintenanceRequest: {
          findFirst: jest.fn().mockResolvedValue(requestRow()),
        },
      });

      await expect(
        service.update(orgId, actorId, Role.MAINTENANCE, 'mr-1', {
          status: 'resolved',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('deletes the request and emits maintenance_request.deleted', async () => {
      const { service, prisma, timeline } = makeService({
        maintenanceRequest: {
          findFirst: jest.fn().mockResolvedValue(requestRow()),
        },
      });

      await service.remove(orgId, actorId, Role.ORG_ADMIN, 'mr-1');

      expect(prisma.maintenanceRequest.delete).toHaveBeenCalledWith({
        where: { id: 'mr-1' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'maintenance_request.deleted' }),
      );
    });

    it('throws NotFoundException for a request in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.remove(orgId, actorId, Role.ORG_ADMIN, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects with ForbiddenException for a maintenance-role caller', async () => {
      const { service } = makeService({
        maintenanceRequest: {
          findFirst: jest.fn().mockResolvedValue(requestRow()),
        },
      });

      await expect(
        service.remove(orgId, actorId, Role.MAINTENANCE, 'mr-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
