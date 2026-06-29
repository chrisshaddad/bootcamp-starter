import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import {
  KeycloakAdminService,
  KeycloakUser,
} from '@/infrastructure/keycloak/keycloak-admin.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, pickPrimaryRole } from '@/common/enums';
import { getPlan } from '@/modules/billing/plan-catalog';

/** Roles that count against the plan's usersLimit. */
const CAPPED_ROLES = new Set<Role>([
  Role.SUPERVISOR,
  Role.FINANCE,
  Role.MAINTENANCE,
]);

/** Roles whose members may be building-scoped. */
const SCOPED_ROLES = new Set<Role>([Role.SUPERVISOR, Role.MAINTENANCE]);

/** Precedence order used when resolving a single primary role from Keycloak. */
const ROLE_ORDER: Role[] = [
  Role.ORG_ADMIN,
  Role.SUPERVISOR,
  Role.FINANCE,
  Role.MAINTENANCE,
  Role.TENANT,
];

type RosterItem = {
  id: string;
  userId: string;
  orgId: string;
  role: Role | null;
  buildingIds: string[];
  username?: string;
  enabled: boolean;
  user: {
    id: string;
    email: string | null;
    fullName: string | null;
    phone: string | null;
  };
  createdAt: string | null;
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
    private readonly timeline: TimelineService,
  ) {}

  /**
   * Staff roster, sourced entirely from Keycloak (org via the org_id attribute,
   * role via client roles). Building assignments are the only DB-side join.
   * - org_admin → all members in the org.
   * - supervisor → read-only roster of maintenance staff sharing a building.
   * - finance / maintenance → 403.
   */
  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
  ): Promise<RosterItem[]> {
    if (callerRole === Role.FINANCE || callerRole === Role.MAINTENANCE) {
      throw new ForbiddenException(
        'finance and maintenance roles cannot list the staff roster.',
      );
    }

    const orgUsers = await this.keycloakAdmin.searchUsersByOrg(orgId);
    const roleByUser = await this.resolveRolesForOrg(orgUsers);

    let visible = orgUsers;
    if (callerRole === Role.SUPERVISOR) {
      // Supervisor sees only maintenance staff sharing one of their buildings.
      const own = await this.prisma.buildingAssignment.findMany({
        where: { userId: callerId, orgId },
        select: { buildingId: true },
      });
      const buildingIds = own.map((a) => a.buildingId);
      const shared = await this.prisma.buildingAssignment.findMany({
        where: { orgId, buildingId: { in: buildingIds } },
        select: { userId: true },
        distinct: ['userId'],
      });
      const sharedIds = new Set(
        shared.map((s) => s.userId).filter((id) => id !== callerId),
      );
      visible = orgUsers.filter(
        (u) => sharedIds.has(u.id) && roleByUser.get(u.id) === Role.MAINTENANCE,
      );
    }

    return this.toRosterItems(visible, orgId, roleByUser);
  }

  async create(
    orgId: string,
    actorId: string,
    dto: CreateUserDto,
  ): Promise<{ data: RosterItem }> {
    const role = dto.role as Role;

    // Staff-cap enforcement (fail-open when no subscription/limit).
    if (CAPPED_ROLES.has(role)) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { orgId },
      });
      const plan = subscription?.planKey ? getPlan(subscription.planKey) : null;
      if (plan && plan.usersLimit !== null) {
        const orgUsers = await this.keycloakAdmin.searchUsersByOrg(orgId);
        const roleByUser = await this.resolveRolesForOrg(orgUsers);
        const staffCount = [...roleByUser.values()].filter((r) =>
          CAPPED_ROLES.has(r),
        ).length;
        if (staffCount >= plan.usersLimit) {
          throw new ConflictException(
            `Plan staff limit reached (${plan.usersLimit}). Upgrade your plan to add more staff.`,
          );
        }
      }
    }

    const [firstName = '', ...rest] = (dto.fullName ?? '').trim().split(' ');
    const lastName = rest.join(' ');

    let kcUserId: string;
    try {
      kcUserId = await this.keycloakAdmin.createUserWithPassword({
        username: dto.username,
        password: dto.password,
        email: dto.email,
        firstName,
        lastName,
        attributes: { org_id: [orgId] },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create KC user '${dto.username}': ${String(error)}`,
      );
      throw error;
    }

    // Assign the app role as a CLIENT role (Keycloak is the source of truth).
    await this.keycloakAdmin.setSingleClientRole(kcUserId, role);

    // Building assignments (the only DB-side data) for scoped roles.
    const buildingIds =
      SCOPED_ROLES.has(role) && dto.buildingIds?.length ? dto.buildingIds : [];
    if (buildingIds.length) {
      await this.createBuildingAssignments(kcUserId, orgId, buildingIds);
    }

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'user.created',
      targetType: 'User',
      targetId: kcUserId,
      metadata: { username: dto.username, role: dto.role },
    });

    return {
      data: {
        id: kcUserId,
        userId: kcUserId,
        orgId,
        role,
        buildingIds,
        username: dto.username,
        enabled: true,
        user: {
          id: kcUserId,
          email: this.cleanEmail(dto.email),
          fullName: dto.fullName ?? null,
          phone: null,
        },
        createdAt: new Date().toISOString(),
      },
    };
  }

  async update(
    orgId: string,
    actorId: string,
    memberId: string,
    dto: UpdateUserDto,
  ): Promise<{ data: RosterItem }> {
    const member = await this.getOrgMember(orgId, memberId);
    const currentRole = pickPrimaryRole(
      await this.keycloakAdmin.getUserClientRoles(memberId),
    );

    // Demoting an org_admin (UpdateUserDto only allows non-admin roles) must not
    // strand the org without an administrator.
    if (dto.role && currentRole === Role.ORG_ADMIN) {
      await this.assertNotLastAdmin(orgId, memberId, 'change the role of');
    }

    if (dto.role) {
      await this.keycloakAdmin.setSingleClientRole(memberId, dto.role as Role);
    }
    if (dto.enabled !== undefined) {
      await this.keycloakAdmin.setUserEnabled(memberId, dto.enabled);
    }

    const newRole = (dto.role as Role) ?? currentRole;
    if (dto.buildingIds !== undefined && newRole && SCOPED_ROLES.has(newRole)) {
      await this.replaceBuildingAssignments(memberId, orgId, dto.buildingIds);
    }

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'user.updated',
      targetType: 'User',
      targetId: memberId,
      metadata: { changes: dto },
    });

    const buildingIds = (
      await this.prisma.buildingAssignment.findMany({
        where: { userId: memberId, orgId },
        select: { buildingId: true },
      })
    ).map((a) => a.buildingId);

    return {
      data: this.toItem(
        { ...member, enabled: dto.enabled ?? member.enabled },
        orgId,
        newRole,
        buildingIds,
      ),
    };
  }

  async remove(orgId: string, actorId: string, memberId: string) {
    await this.getOrgMember(orgId, memberId);
    const currentRole = pickPrimaryRole(
      await this.keycloakAdmin.getUserClientRoles(memberId),
    );

    if (currentRole === Role.ORG_ADMIN) {
      await this.assertNotLastAdmin(orgId, memberId, 'remove');
    }

    await this.prisma.buildingAssignment.deleteMany({
      where: { userId: memberId, orgId },
    });
    await this.keycloakAdmin.deleteUser(memberId);

    await this.timeline.emit({
      orgId,
      actorId,
      action: 'user.removed',
      targetType: 'User',
      targetId: memberId,
    });

    return { removed: true };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /** Fetch a Keycloak user and assert they belong to the caller's org. */
  private async getOrgMember(
    orgId: string,
    memberId: string,
  ): Promise<KeycloakUser> {
    const user = (await this.keycloakAdmin.getUser(
      memberId,
    )) as unknown as KeycloakUser | null;
    if (!user || user.attributes?.org_id?.[0] !== orgId) {
      throw new NotFoundException('Member not found in your organisation.');
    }
    return user;
  }

  /** Map each org user's id → its primary client role (precedence-resolved). */
  private async resolveRolesForOrg(
    orgUsers: KeycloakUser[],
  ): Promise<Map<string, Role>> {
    const orgIds = new Set(orgUsers.map((u) => u.id));
    const map = new Map<string, Role>();
    for (const role of ROLE_ORDER) {
      const withRole = await this.keycloakAdmin.getUsersWithClientRole(role);
      for (const u of withRole) {
        if (orgIds.has(u.id) && !map.has(u.id)) map.set(u.id, role);
      }
    }
    return map;
  }

  /** Refuse an operation that would leave the org with zero org_admins. */
  private async assertNotLastAdmin(
    orgId: string,
    memberId: string,
    verb: string,
  ): Promise<void> {
    const admins = await this.keycloakAdmin.getUsersWithClientRole(
      Role.ORG_ADMIN,
    );
    const others = admins.filter(
      (u) => u.id !== memberId && u.attributes?.org_id?.[0] === orgId,
    );
    if (others.length === 0) {
      throw new ConflictException(
        `Cannot ${verb} the last administrator of the organisation.`,
      );
    }
  }

  private async toRosterItems(
    users: KeycloakUser[],
    orgId: string,
    roleByUser: Map<string, Role>,
  ): Promise<RosterItem[]> {
    if (!users.length) return [];
    const ids = users.map((u) => u.id);
    const assignments = await this.prisma.buildingAssignment.findMany({
      where: { orgId, userId: { in: ids } },
      select: { userId: true, buildingId: true },
    });
    const buildingMap = new Map<string, string[]>();
    for (const a of assignments) {
      const list = buildingMap.get(a.userId) ?? [];
      list.push(a.buildingId);
      buildingMap.set(a.userId, list);
    }
    return users.map((u) =>
      this.toItem(
        u,
        orgId,
        roleByUser.get(u.id) ?? null,
        buildingMap.get(u.id) ?? [],
      ),
    );
  }

  private toItem(
    u: KeycloakUser,
    orgId: string,
    role: Role | null,
    buildingIds: string[],
  ): RosterItem {
    const fullName =
      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null;
    return {
      id: u.id,
      userId: u.id,
      orgId,
      role,
      buildingIds,
      username: u.username,
      enabled: u.enabled ?? true,
      user: {
        id: u.id,
        email: this.cleanEmail(u.email),
        fullName,
        phone: u.attributes?.phone_number?.[0] ?? null,
      },
      createdAt: u.createdTimestamp
        ? new Date(u.createdTimestamp).toISOString()
        : null,
    };
  }

  /** Hide the synthetic placeholder email used for accounts created without one. */
  private cleanEmail(email?: string | null): string | null {
    if (!email || email.endsWith('@no-email.local')) return null;
    return email;
  }

  private async createBuildingAssignments(
    userId: string,
    orgId: string,
    buildingIds: string[],
  ) {
    const buildings = await this.prisma.building.findMany({
      where: { id: { in: buildingIds }, orgId },
      select: { id: true },
    });
    const validIds = new Set(buildings.map((b) => b.id));
    const rows = buildingIds
      .filter((id) => validIds.has(id))
      .map((buildingId) => ({ userId, orgId, buildingId }));
    if (rows.length) {
      await this.prisma.buildingAssignment.createMany({
        data: rows,
        skipDuplicates: true,
      });
    }
  }

  private async replaceBuildingAssignments(
    userId: string,
    orgId: string,
    buildingIds: string[],
  ) {
    await this.prisma.buildingAssignment.deleteMany({
      where: { userId, orgId },
    });
    if (buildingIds.length) {
      await this.createBuildingAssignments(userId, orgId, buildingIds);
    }
  }
}
