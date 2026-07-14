import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { ApartmentsService } from './apartments.service';
import { Role } from '@/common/enums';

describe('ApartmentsService', () => {
  const orgId = 'org-1';
  const buildingId = 'building-1';
  const floorId = 'floor-1';
  const actorId = 'actor-1';

  function makeService(
    overrides: {
      apartment?: Partial<Record<string, jest.Mock>>;
      floor?: Partial<Record<string, jest.Mock>>;
      buildingAccess?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma = {
      apartment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.apartment,
      },
      floor: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: floorId, orgId, buildingId }),
        ...overrides.floor,
      },
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const buildingAccess = {
      assertBuildingAccess: jest.fn().mockResolvedValue(undefined),
      getAllowedBuildingIds: jest.fn(),
      ...overrides.buildingAccess,
    };
    const service = new ApartmentsService(
      prisma as any,
      timeline as any,
      buildingAccess as any,
    );
    return { service, prisma, timeline, buildingAccess };
  }

  const apartmentRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'apartment-1',
    orgId,
    buildingId,
    floorId,
    unitNumber: '101',
    bedrooms: 2,
    bathrooms: new Prisma.Decimal('1.5'),
    sqft: 850,
    status: 'vacant',
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  describe('create', () => {
    const dto = { unitNumber: '101', bedrooms: 2, bathrooms: 1.5, sqft: 850 };

    it('creates an apartment and defaults status to vacant when not provided', async () => {
      const { service, prisma } = makeService();
      prisma.apartment.create.mockResolvedValue(apartmentRow());

      await service.create(orgId, actorId, buildingId, floorId, dto);

      expect(prisma.apartment.create).toHaveBeenCalledWith({
        data: {
          orgId,
          buildingId,
          floorId,
          unitNumber: '101',
          bedrooms: 2,
          bathrooms: 1.5,
          sqft: 850,
          notes: undefined,
        },
      });
    });

    it('passes through an explicit status', async () => {
      const { service, prisma } = makeService();
      prisma.apartment.create.mockResolvedValue(
        apartmentRow({ status: 'occupied' }),
      );

      await service.create(orgId, actorId, buildingId, floorId, {
        ...dto,
        status: 'occupied',
      });

      expect(prisma.apartment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'occupied' }),
        }),
      );
    });

    it('rejects a duplicate unit number within the same building', async () => {
      const { service, prisma } = makeService({
        apartment: { findFirst: jest.fn().mockResolvedValue(apartmentRow()) },
      });

      await expect(
        service.create(orgId, actorId, buildingId, floorId, dto),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.apartment.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the floor does not belong to the building/org', async () => {
      const { service } = makeService({
        floor: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      await expect(
        service.create(orgId, actorId, buildingId, floorId, dto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('re-checks unit-number uniqueness only when it changes', async () => {
      const { service, prisma } = makeService({
        apartment: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce(apartmentRow())
            .mockResolvedValueOnce(null),
        },
      });
      prisma.apartment.update.mockResolvedValue(
        apartmentRow({ unitNumber: '102' }),
      );

      await service.update(orgId, actorId, buildingId, floorId, 'apartment-1', {
        unitNumber: '102',
      });

      expect(prisma.apartment.findFirst).toHaveBeenCalledTimes(2);
      expect(prisma.apartment.update).toHaveBeenCalledWith({
        where: { id: 'apartment-1' },
        data: { unitNumber: '102' },
      });
    });

    it('throws NotFoundException for an apartment outside the floor/building/org', async () => {
      const { service } = makeService();

      await expect(
        service.update(orgId, actorId, buildingId, floorId, 'missing', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the apartment and emits apartment.deleted', async () => {
      const { service, prisma, timeline } = makeService({
        apartment: { findFirst: jest.fn().mockResolvedValue(apartmentRow()) },
      });

      await service.remove(orgId, actorId, buildingId, floorId, 'apartment-1');

      expect(prisma.apartment.delete).toHaveBeenCalledWith({
        where: { id: 'apartment-1' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'apartment.deleted' }),
      );
    });

    it('throws NotFoundException for an apartment outside the floor/building/org', async () => {
      const { service } = makeService();

      await expect(
        service.remove(orgId, actorId, buildingId, floorId, 'missing'),
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
        service.findAll(
          orgId,
          'caller-1',
          Role.SUPERVISOR,
          buildingId,
          floorId,
        ),
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
        apartment: { findFirst: jest.fn().mockResolvedValue(apartmentRow()) },
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
          floorId,
          'apartment-1',
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
