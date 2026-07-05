import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FloorsService } from './floors.service';
import { Role } from '@/common/enums';

describe('FloorsService', () => {
  const orgId = 'org-1';
  const buildingId = 'building-1';
  const actorId = 'actor-1';

  function makeService(
    overrides: {
      floor?: Partial<Record<string, jest.Mock>>;
      building?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma = {
      floor: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        aggregate: jest.fn().mockResolvedValue({ _max: { order: null } }),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.floor,
      },
      building: {
        findFirst: jest.fn().mockResolvedValue({ id: buildingId, orgId }),
        ...overrides.building,
      },
      apartment: {
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const buildingAccess = {
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      getAllowedBuildingIds: jest.fn(),
      ...overrides.buildingAccess,
    };
    const service = new FloorsService(
      prisma as any,
      timeline as any,
      buildingAccess as any,
    );
    return { service, prisma, timeline, buildingAccess };
  }

  const floorRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'floor-1',
    orgId,
    buildingId,
    name: 'Floor 1',
    order: 0,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  describe('createDefaultFloor', () => {
    it('creates a "Ground Floor" at order 0 through the given transaction client', async () => {
      const { service } = makeService();
      const tx = { floor: { create: jest.fn().mockResolvedValue(floorRow()) } };

      await service.createDefaultFloor(tx as any, orgId, buildingId);

      expect(tx.floor.create).toHaveBeenCalledWith({
        data: { orgId, buildingId, name: 'Ground Floor', order: 0 },
      });
    });
  });

  describe('create', () => {
    it('computes order as the current max + 1 for the building', async () => {
      const { service, prisma } = makeService({
        floor: {
          aggregate: jest.fn().mockResolvedValue({ _max: { order: 3 } }),
        },
      });
      prisma.floor.create.mockResolvedValue(floorRow({ order: 4 }));

      await service.create(orgId, actorId, buildingId, { name: 'Floor 4' });

      expect(prisma.floor.create).toHaveBeenCalledWith({
        data: {
          orgId,
          buildingId,
          name: 'Floor 4',
          notes: undefined,
          order: 4,
        },
      });
    });

    it('starts at order 0 when the building has no floors yet', async () => {
      const { service, prisma } = makeService();
      prisma.floor.create.mockResolvedValue(floorRow({ order: 0 }));

      await service.create(orgId, actorId, buildingId, { name: 'Floor 1' });

      expect(prisma.floor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 0 }),
        }),
      );
    });

    it('rejects a duplicate name within the same building', async () => {
      const { service, prisma } = makeService({
        floor: { findFirst: jest.fn().mockResolvedValue(floorRow()) },
      });

      await expect(
        service.create(orgId, actorId, buildingId, { name: 'Floor 1' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.floor.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the building does not belong to the org', async () => {
      const { service } = makeService({
        building: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.create(orgId, actorId, buildingId, { name: 'Floor 1' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes a floor with no apartments on it', async () => {
      const { service, prisma } = makeService({
        floor: { findFirst: jest.fn().mockResolvedValue(floorRow()) },
      });

      await service.remove(orgId, actorId, buildingId, 'floor-1');

      expect(prisma.apartment.count).toHaveBeenCalledWith({
        where: { floorId: 'floor-1' },
      });
      expect(prisma.floor.delete).toHaveBeenCalledWith({
        where: { id: 'floor-1' },
      });
    });

    it('rejects deleting a floor that still has apartments on it', async () => {
      const { service, prisma } = makeService({
        floor: { findFirst: jest.fn().mockResolvedValue(floorRow()) },
      });
      prisma.apartment.count.mockResolvedValue(2);

      await expect(
        service.remove(orgId, actorId, buildingId, 'floor-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.floor.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a floor outside the building/org', async () => {
      const { service } = makeService();

      await expect(
        service.remove(orgId, actorId, buildingId, 'missing-floor'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('access scoping', () => {
    it('delegates read access to BuildingAccessService and propagates rejection on findAll', async () => {
      const { service, buildingAccess } = makeService({
        buildingAccess: {
          assertBuildingAccess: jest
            .fn()
            .mockRejectedValue(new ForbiddenException()),
        },
      });

      await expect(
        service.findAll(orgId, 'caller-1', Role.SUPERVISOR, buildingId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(buildingAccess.assertBuildingAccess).toHaveBeenCalledWith(
        orgId,
        'caller-1',
        Role.SUPERVISOR,
        buildingId,
      );
    });

    it('delegates read access to BuildingAccessService and propagates rejection on findOne', async () => {
      const { service, buildingAccess } = makeService({
        floor: { findFirst: jest.fn().mockResolvedValue(floorRow()) },
        buildingAccess: {
          assertBuildingAccess: jest
            .fn()
            .mockRejectedValue(new ForbiddenException()),
        },
      });

      await expect(
        service.findOne(
          orgId,
          'caller-1',
          Role.MAINTENANCE,
          buildingId,
          'floor-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(buildingAccess.assertBuildingAccess).toHaveBeenCalledWith(
        orgId,
        'caller-1',
        Role.MAINTENANCE,
        buildingId,
      );
    });
  });
});
