import { NotFoundException } from '@nestjs/common';
import { RentersService } from './renters.service';

describe('RentersService', () => {
  const orgId = 'org-1';
  const actorId = 'actor-1';

  function makeService(
    overrides: {
      renter?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma = {
      renter: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.renter,
      },
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const service = new RentersService(prisma as any, timeline as any);
    return { service, prisma, timeline };
  }

  const renterRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'renter-1',
    orgId,
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '555-1234',
    emergencyContactName: null,
    emergencyContactPhone: null,
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  describe('findAll', () => {
    it('returns all renters in the org with effectiveStatus always none', async () => {
      const { service, prisma } = makeService({
        renter: { findMany: jest.fn().mockResolvedValue([renterRow()]) },
      });

      const result = await service.findAll(orgId);

      expect(prisma.renter.findMany).toHaveBeenCalledWith({
        where: { orgId },
        orderBy: { createdAt: 'asc' },
      });
      expect(result.data).toEqual([
        expect.objectContaining({ id: 'renter-1', effectiveStatus: 'none' }),
      ]);
    });
  });

  describe('findOne', () => {
    it('returns the renter with effectiveStatus none', async () => {
      const { service } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renterRow()) },
      });

      const result = await service.findOne(orgId, 'renter-1');

      expect(result.data).toEqual(
        expect.objectContaining({ id: 'renter-1', effectiveStatus: 'none' }),
      );
    });

    it('throws NotFoundException for a renter outside the org', async () => {
      const { service } = makeService();

      await expect(service.findOne(orgId, 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const dto = { fullName: 'Jane Doe' };

    it('creates a renter scoped to the org and emits renter.created', async () => {
      const { service, prisma, timeline } = makeService();
      prisma.renter.create.mockResolvedValue(renterRow());

      await service.create(orgId, actorId, dto);

      expect(prisma.renter.create).toHaveBeenCalledWith({
        data: {
          orgId,
          fullName: 'Jane Doe',
          email: undefined,
          phone: undefined,
          emergencyContactName: undefined,
          emergencyContactPhone: undefined,
          notes: undefined,
        },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId,
          actorId,
          action: 'renter.created',
          targetType: 'Renter',
        }),
      );
    });
  });

  describe('update', () => {
    it('updates only the provided fields and emits renter.updated', async () => {
      const { service, prisma, timeline } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renterRow()) },
      });
      prisma.renter.update.mockResolvedValue(
        renterRow({ fullName: 'Jane Smith' }),
      );

      await service.update(orgId, actorId, 'renter-1', {
        fullName: 'Jane Smith',
      });

      expect(prisma.renter.update).toHaveBeenCalledWith({
        where: { id: 'renter-1' },
        data: { fullName: 'Jane Smith' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'renter.updated' }),
      );
    });

    it('throws NotFoundException for a renter outside the org', async () => {
      const { service } = makeService();

      await expect(
        service.update(orgId, actorId, 'missing', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the renter and emits renter.deleted', async () => {
      const { service, prisma, timeline } = makeService({
        renter: { findFirst: jest.fn().mockResolvedValue(renterRow()) },
      });

      await service.remove(orgId, actorId, 'renter-1');

      expect(prisma.renter.delete).toHaveBeenCalledWith({
        where: { id: 'renter-1' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'renter.deleted' }),
      );
    });

    it('throws NotFoundException for a renter outside the org', async () => {
      const { service } = makeService();

      await expect(
        service.remove(orgId, actorId, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
