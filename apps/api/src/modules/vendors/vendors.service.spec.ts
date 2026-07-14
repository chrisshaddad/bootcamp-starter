import { ConflictException, NotFoundException } from '@nestjs/common';
import { VendorsService } from './vendors.service';

describe('VendorsService', () => {
  const orgId = 'org-1';

  const actorId = 'actor-1';

  function makeService(
    overrides: {
      vendor?: Partial<Record<string, jest.Mock>>;
      workOrder?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma = {
      vendor: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        ...overrides.vendor,
      },
      workOrder: {
        count: jest.fn().mockResolvedValue(0),
        ...overrides.workOrder,
      },
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const service = new VendorsService(prisma as any, timeline as any);
    return { service, prisma, timeline };
  }

  const vendorRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 'vendor-1',
    orgId,
    companyName: 'Acme Plumbing',
    contactName: 'Jane Doe',
    email: 'jane@acme.example',
    phone: '555-1234',
    address: '123 Main St',
    servicesOffered: ['plumbing'],
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  describe('findAll', () => {
    it('returns only vendors belonging to the caller org', async () => {
      const { service, prisma } = makeService({
        vendor: { findMany: jest.fn().mockResolvedValue([vendorRow()]) },
      });

      const result = await service.findAll(orgId);

      expect(prisma.vendor.findMany).toHaveBeenCalledWith({
        where: { orgId },
        orderBy: { createdAt: 'asc' },
      });
      expect(result.data).toEqual([
        expect.objectContaining({
          id: 'vendor-1',
          companyName: 'Acme Plumbing',
        }),
      ]);
    });
  });

  describe('findOne', () => {
    it('returns the vendor when it belongs to the caller org', async () => {
      const { service, prisma } = makeService({
        vendor: { findFirst: jest.fn().mockResolvedValue(vendorRow()) },
      });

      const result = await service.findOne(orgId, 'vendor-1');

      expect(prisma.vendor.findFirst).toHaveBeenCalledWith({
        where: { id: 'vendor-1', orgId },
      });
      expect(result.data).toEqual(expect.objectContaining({ id: 'vendor-1' }));
    });

    it('throws NotFoundException for a vendor in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.findOne(orgId, 'vendor-in-other-org'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('round-trips multiple servicesOffered values unchanged', async () => {
      const { service } = makeService({
        vendor: {
          findFirst: jest
            .fn()
            .mockResolvedValue(
              vendorRow({ servicesOffered: ['plumbing', 'hvac', 'other'] }),
            ),
        },
      });

      const result = await service.findOne(orgId, 'vendor-1');

      expect(result.data.servicesOffered).toEqual([
        'plumbing',
        'hvac',
        'other',
      ]);
    });
  });

  describe('create', () => {
    const dto = { companyName: 'Acme Plumbing' };

    it('creates a vendor with only companyName set and emits vendor.created', async () => {
      const { service, prisma, timeline } = makeService();
      prisma.vendor.create.mockResolvedValue(
        vendorRow({
          contactName: null,
          email: null,
          phone: null,
          address: null,
          servicesOffered: [],
          notes: null,
        }),
      );

      await service.create(orgId, actorId, dto);

      expect(prisma.vendor.create).toHaveBeenCalledWith({
        data: {
          orgId,
          companyName: 'Acme Plumbing',
          contactName: undefined,
          email: undefined,
          phone: undefined,
          address: undefined,
          servicesOffered: undefined,
          notes: undefined,
        },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId,
          actorId,
          action: 'vendor.created',
          targetType: 'Vendor',
        }),
      );
    });

    it('persists multiple servicesOffered values', async () => {
      const { service, prisma } = makeService();
      prisma.vendor.create.mockResolvedValue(
        vendorRow({ servicesOffered: ['plumbing', 'hvac'] }),
      );

      await service.create(orgId, actorId, {
        companyName: 'Acme Plumbing',
        servicesOffered: ['plumbing', 'hvac'],
      });

      expect(prisma.vendor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            servicesOffered: ['plumbing', 'hvac'],
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates only the provided fields and emits vendor.updated', async () => {
      const { service, prisma, timeline } = makeService({
        vendor: { findFirst: jest.fn().mockResolvedValue(vendorRow()) },
      });
      prisma.vendor.update.mockResolvedValue(
        vendorRow({ companyName: 'Acme Plumbing & Heating' }),
      );

      await service.update(orgId, actorId, 'vendor-1', {
        companyName: 'Acme Plumbing & Heating',
      });

      expect(prisma.vendor.update).toHaveBeenCalledWith({
        where: { id: 'vendor-1' },
        data: { companyName: 'Acme Plumbing & Heating' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'vendor.updated' }),
      );
    });

    it('throws NotFoundException for a vendor in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.update(orgId, actorId, 'missing', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the vendor when no work order references it and emits vendor.deleted', async () => {
      const { service, prisma, timeline } = makeService({
        vendor: { findFirst: jest.fn().mockResolvedValue(vendorRow()) },
      });

      await service.remove(orgId, actorId, 'vendor-1');

      expect(prisma.workOrder.count).toHaveBeenCalledWith({
        where: { vendorId: 'vendor-1' },
      });
      expect(prisma.vendor.delete).toHaveBeenCalledWith({
        where: { id: 'vendor-1' },
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'vendor.deleted' }),
      );
    });

    it('throws ConflictException when a work order references the vendor', async () => {
      const { service, prisma } = makeService({
        vendor: { findFirst: jest.fn().mockResolvedValue(vendorRow()) },
        workOrder: { count: jest.fn().mockResolvedValue(1) },
      });

      await expect(
        service.remove(orgId, actorId, 'vendor-1'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.vendor.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for a vendor in a different org', async () => {
      const { service } = makeService();

      await expect(
        service.remove(orgId, actorId, 'missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
