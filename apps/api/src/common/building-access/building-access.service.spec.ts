import { ForbiddenException } from '@nestjs/common';
import { BuildingAccessService } from './building-access.service';
import { Role } from '@/common/enums';

describe('BuildingAccessService', () => {
  const orgId = 'org-1';
  const callerId = 'user-1';
  const buildingId = 'building-1';

  function makeService(assignments: Array<{ buildingId: string }> = []) {
    const prisma = {
      buildingAssignment: {
        findMany: jest.fn().mockResolvedValue(assignments),
        findFirst: jest
          .fn()
          .mockResolvedValue(assignments.length ? assignments[0] : null),
      },
    };
    return {
      service: new BuildingAccessService(prisma as any),
      prisma,
    };
  }

  describe('getAllowedBuildingIds', () => {
    it.each([Role.ORG_ADMIN, Role.FINANCE])(
      'returns null (unrestricted) for org-wide role %s',
      async (role) => {
        const { service, prisma } = makeService();
        const result = await service.getAllowedBuildingIds(
          orgId,
          callerId,
          role,
        );
        expect(result).toBeNull();
        expect(prisma.buildingAssignment.findMany).not.toHaveBeenCalled();
      },
    );

    it.each([Role.SUPERVISOR, Role.MAINTENANCE])(
      'returns only assigned building IDs for scoped role %s',
      async (role) => {
        const { service } = makeService([
          { buildingId: 'a' },
          { buildingId: 'b' },
        ]);
        const result = await service.getAllowedBuildingIds(
          orgId,
          callerId,
          role,
        );
        expect(result).toEqual(['a', 'b']);
      },
    );

    it('returns an empty array for a scoped role with no assignments', async () => {
      const { service } = makeService([]);
      const result = await service.getAllowedBuildingIds(
        orgId,
        callerId,
        Role.SUPERVISOR,
      );
      expect(result).toEqual([]);
    });
  });

  describe('assertBuildingAccess', () => {
    it.each([Role.ORG_ADMIN, Role.FINANCE])(
      'does not throw for org-wide role %s regardless of assignment',
      async (role) => {
        const { service, prisma } = makeService([]);
        await expect(
          service.assertBuildingAccess(orgId, callerId, role, buildingId),
        ).resolves.toBeUndefined();
        expect(prisma.buildingAssignment.findFirst).not.toHaveBeenCalled();
      },
    );

    it('does not throw for a scoped role assigned to the building', async () => {
      const { service } = makeService([{ buildingId }]);
      await expect(
        service.assertBuildingAccess(
          orgId,
          callerId,
          Role.SUPERVISOR,
          buildingId,
        ),
      ).resolves.toBeUndefined();
    });

    it('throws ForbiddenException for a scoped role not assigned to the building', async () => {
      const { service } = makeService([]);
      await expect(
        service.assertBuildingAccess(
          orgId,
          callerId,
          Role.MAINTENANCE,
          buildingId,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
