import { AvailableUnitsService } from './available-units.service';

describe('AvailableUnitsService', () => {
  const orgId = 'org-1';

  function makeService(
    overrides: {
      apartment?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      apartment: {
        findMany: jest.fn().mockResolvedValue([]),
        ...overrides.apartment,
      },
    };
    const service = new AvailableUnitsService(prisma);
    return { service, prisma };
  }

  describe('findAvailable', () => {
    it('scopes the query to the org and vacant apartments only, ordered by building then unit number', async () => {
      const { service, prisma } = makeService();

      await service.findAvailable(orgId);

      expect(prisma.apartment.findMany).toHaveBeenCalledWith({
        where: { orgId, status: 'vacant' },
        include: {
          building: { select: { name: true } },
          floor: { select: { name: true } },
        },
        orderBy: [{ building: { name: 'asc' } }, { unitNumber: 'asc' }],
      });
    });

    it('maps each vacant apartment to an AvailableUnit enriched with building/floor names', async () => {
      const { service } = makeService({
        apartment: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'apt-1',
              buildingId: 'building-1',
              floorId: 'floor-1',
              unitNumber: '101',
              bedrooms: 2,
              bathrooms: { toString: () => '1.5' },
              sqft: 850,
              building: { name: 'Sunrise Tower' },
              floor: { name: 'Ground Floor' },
            },
          ]),
        },
      });

      const result = await service.findAvailable(orgId);

      expect(result).toEqual({
        data: [
          {
            id: 'apt-1',
            buildingId: 'building-1',
            buildingName: 'Sunrise Tower',
            floorId: 'floor-1',
            floorName: 'Ground Floor',
            unitNumber: '101',
            bedrooms: 2,
            bathrooms: '1.5',
            sqft: 850,
          },
        ],
      });
    });

    it('returns an empty list when the org has no vacant apartments', async () => {
      const { service } = makeService();

      const result = await service.findAvailable(orgId);

      expect(result).toEqual({ data: [] });
    });
  });
});
