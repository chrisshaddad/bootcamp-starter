import { NotFoundException } from '@nestjs/common';
import { VendorsService } from './vendors.service';

describe('VendorsService', () => {
  const orgId = 'org-1';

  function makeService(
    overrides: {
      vendor?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma = {
      vendor: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.vendor,
      },
    };
    const service = new VendorsService(prisma as any);
    return { service, prisma };
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
});
