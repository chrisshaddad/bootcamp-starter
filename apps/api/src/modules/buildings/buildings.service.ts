import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { Role } from '@/common/enums';
import { getPlan } from '@/modules/billing/plan-catalog';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

/** Roles that see ALL buildings (org-wide). */
const ORG_WIDE_ROLES = new Set<Role>([Role.ORG_ADMIN, Role.FINANCE]);

@Injectable()
export class BuildingsService {
  private readonly logger = new Logger(BuildingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
    private readonly timeline: TimelineService,
  ) {}

  // ── Building scope helper ────────────────────────────────────────────────

  /**
   * Returns the set of building IDs the caller may access, or null meaning ALL.
   * - org_admin / finance → null (all).
   * - supervisor / maintenance → assigned building IDs.
   */
  private async resolveAllowedBuildingIds(
    callerId: string,
    orgId: string,
    callerRole: Role,
  ): Promise<string[] | null> {
    if (ORG_WIDE_ROLES.has(callerRole)) return null;

    const assignments = await this.prisma.buildingAssignment.findMany({
      where: { userId: callerId, orgId },
      select: { buildingId: true },
    });
    return assignments.map((a) => a.buildingId);
  }

  // ── Format helpers ────────────────────────────────────────────────────────

  private async formatBuilding(building: {
    id: string;
    orgId: string;
    name: string;
    address: string | null;
    code: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const assignments = await this.prisma.buildingAssignment.findMany({
      where: { buildingId: building.id },
      select: { userId: true },
    });
    return {
      id: building.id,
      name: building.name,
      address: building.address,
      code: building.code,
      notes: building.notes,
      createdAt: building.createdAt,
      assignedUserIds: assignments.map((a) => a.userId),
    };
  }

  private async formatBuildings(
    buildings: Array<{
      id: string;
      orgId: string;
      name: string;
      address: string | null;
      code: string | null;
      notes: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    if (!buildings.length) return [];

    const ids = buildings.map((b) => b.id);
    const assignments = await this.prisma.buildingAssignment.findMany({
      where: { buildingId: { in: ids } },
      select: { buildingId: true, userId: true },
    });

    const map = new Map<string, string[]>();
    for (const a of assignments) {
      if (!map.has(a.buildingId)) map.set(a.buildingId, []);
      map.get(a.buildingId)!.push(a.userId);
    }

    return buildings.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      code: b.code,
      notes: b.notes,
      createdAt: b.createdAt,
      assignedUserIds: map.get(b.id) ?? [],
    }));
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(orgId: string, callerId: string, callerRole: Role) {
    const allowedIds = await this.resolveAllowedBuildingIds(
      callerId,
      orgId,
      callerRole,
    );

    const where =
      allowedIds === null ? { orgId } : { orgId, id: { in: allowedIds } };

    const buildings = await this.prisma.building.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    return { data: await this.formatBuildings(buildings) };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    buildingId: string,
  ) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, orgId },
    });
    if (!building) throw new NotFoundException('Building not found.');

    // Scope check for restricted roles
    if (!ORG_WIDE_ROLES.has(callerRole)) {
      const assignment = await this.prisma.buildingAssignment.findFirst({
        where: { buildingId, userId: callerId, orgId },
      });
      if (!assignment) {
        throw new ForbiddenException('You are not assigned to this building.');
      }
    }

    return { data: await this.formatBuilding(building) };
  }

  async create(orgId: string, actorId: string, dto: CreateBuildingDto) {
    // Enforce buildingsLimit — fail-open when no subscription/planKey/limit
    const subscription = await this.prisma.subscription.findUnique({
      where: { orgId },
    });
    if (subscription?.planKey) {
      const plan = getPlan(subscription.planKey);
      if (plan && plan.buildingsLimit !== null) {
        const count = await this.prisma.building.count({ where: { orgId } });
        if (count >= plan.buildingsLimit) {
          throw new ConflictException(
            `Plan building limit reached (${plan.buildingsLimit}). Upgrade your plan to add more buildings.`,
          );
        }
      }
    }

    const building = await this.prisma.building.create({
      data: {
        orgId,
        name: dto.name,
        address: dto.address,
        code: dto.code,
        notes: dto.notes,
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'building.created',
      targetType: 'Building',
      targetId: building.id,
      metadata: { name: dto.name },
    });

    return { data: await this.formatBuilding(building) };
  }

  async update(
    orgId: string,
    actorId: string,
    buildingId: string,
    dto: UpdateBuildingDto,
  ) {
    const existing = await this.prisma.building.findFirst({
      where: { id: buildingId, orgId },
    });
    if (!existing) throw new NotFoundException('Building not found.');

    const building = await this.prisma.building.update({
      where: { id: buildingId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'building.updated',
      targetType: 'Building',
      targetId: buildingId,
      metadata: { changes: dto },
    });

    return { data: await this.formatBuilding(building) };
  }

  async remove(orgId: string, actorId: string, buildingId: string) {
    const existing = await this.prisma.building.findFirst({
      where: { id: buildingId, orgId },
    });
    if (!existing) throw new NotFoundException('Building not found.');

    await this.prisma.building.delete({ where: { id: buildingId } });

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'building.deleted',
      targetType: 'Building',
      targetId: buildingId,
      metadata: { name: existing.name },
    });

    return { data: { id: buildingId } };
  }

  /**
   * PUT /buildings/:id/assignments
   * Replace all BuildingAssignment rows for this building.
   * Only creates assignments for userIds that are supervisor/maintenance members of the org.
   */
  async setAssignments(
    orgId: string,
    actorId: string,
    buildingId: string,
    userIds: string[],
  ) {
    const building = await this.prisma.building.findFirst({
      where: { id: buildingId, orgId },
    });
    if (!building) throw new NotFoundException('Building not found.');

    // Validate via Keycloak: only supervisor/maintenance members of this org.
    const orgUserIds = new Set(
      (await this.keycloakAdmin.searchUsersByOrg(orgId)).map((u) => u.id),
    );
    const scopedUserIds = new Set<string>();
    for (const role of [Role.SUPERVISOR, Role.MAINTENANCE]) {
      for (const u of await this.keycloakAdmin.getUsersWithClientRole(role)) {
        if (orgUserIds.has(u.id)) scopedUserIds.add(u.id);
      }
    }
    const validUserIds = new Set(userIds.filter((id) => scopedUserIds.has(id)));

    // Replace: delete existing, then insert valid
    await this.prisma.buildingAssignment.deleteMany({
      where: { buildingId, orgId },
    });

    const rows = [...validUserIds].map((userId) => ({
      userId,
      orgId,
      buildingId,
    }));

    if (rows.length) {
      await this.prisma.buildingAssignment.createMany({
        data: rows,
        skipDuplicates: true,
      });
    }

    const skipped = userIds.filter((id) => !validUserIds.has(id));
    if (skipped.length) {
      this.logger.warn(
        `setAssignments: skipped ${skipped.length} userIds not found as supervisor/maintenance in org ${orgId}`,
      );
    }

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'building.assignments_set',
      targetType: 'Building',
      targetId: buildingId,
      metadata: { assignedUserIds: [...validUserIds] },
    });

    return { data: await this.formatBuilding(building) };
  }
}
