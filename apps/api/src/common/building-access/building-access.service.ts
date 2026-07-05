import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Role } from '@/common/enums';

/** Roles that see ALL buildings in their org (org-wide), bypassing BuildingAssignment scoping. */
export const ORG_WIDE_BUILDING_ROLES = new Set<Role>([
  Role.ORG_ADMIN,
  Role.FINANCE,
]);

@Injectable()
export class BuildingAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the set of building IDs the caller may access, or null meaning ALL.
   * - org_admin / finance → null (all).
   * - supervisor / maintenance → assigned building IDs.
   */
  async getAllowedBuildingIds(
    orgId: string,
    callerId: string,
    callerRole: Role,
  ): Promise<string[] | null> {
    if (ORG_WIDE_BUILDING_ROLES.has(callerRole)) return null;

    const assignments = await this.prisma.buildingAssignment.findMany({
      where: { userId: callerId, orgId },
      select: { buildingId: true },
    });
    return assignments.map((a) => a.buildingId);
  }

  /**
   * Throws ForbiddenException unless the caller is org-wide or assigned to
   * this specific building.
   */
  async assertBuildingAccess(
    orgId: string,
    callerId: string,
    callerRole: Role,
    buildingId: string,
  ): Promise<void> {
    if (ORG_WIDE_BUILDING_ROLES.has(callerRole)) return;

    const assignment = await this.prisma.buildingAssignment.findFirst({
      where: { buildingId, userId: callerId, orgId },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not assigned to this building.');
    }
  }
}
