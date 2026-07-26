import { Injectable, Logger } from '@nestjs/common';
import { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';
import { Role } from '@/common/enums';

/** How long a resolved admin roster stays cached, in milliseconds. */
const CACHE_TTL_MS = 60_000;

type CacheEntry = { userIds: string[]; expiresAt: number };

/**
 * Resolves the staff who should be told about a tenant-originated event.
 *
 * Keycloak is the source of truth for users and roles (there is no local User
 * table), so "the org admins" means: users carrying the `org_admin` client role
 * whose `org_id` attribute matches the org. That is two admin-API calls, so
 * results are cached briefly — a ticket burst must not turn into a Keycloak
 * hammering.
 *
 * Deliberately BEST-EFFORT: it returns `[]` and never throws, because a
 * notification fan-out must never fail the request that triggered it (same
 * contract as {@link NotificationsService.enqueue} and TimelineService.emit).
 */
@Injectable()
export class OrgRecipientsService {
  private readonly logger = new Logger(OrgRecipientsService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly keycloak: KeycloakAdminService) {}

  /**
   * Keycloak `sub`s of the org's admins.
   *
   * @param excludeUserId omitted from the result — used so an actor is never
   *   notified about their own action.
   */
  async getOrgAdminUserIds(
    orgId: string,
    excludeUserId?: string,
  ): Promise<string[]> {
    const userIds = await this.resolveOrgAdminUserIds(orgId);
    return excludeUserId
      ? userIds.filter((id) => id !== excludeUserId)
      : userIds;
  }

  private async resolveOrgAdminUserIds(orgId: string): Promise<string[]> {
    const cached = this.cache.get(orgId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.userIds;
    }

    try {
      const [orgUsers, admins] = await Promise.all([
        this.keycloak.searchUsersByOrg(orgId),
        this.keycloak.getUsersWithClientRole(Role.ORG_ADMIN),
      ]);

      // `getUsersWithClientRole` spans the whole realm — intersect with the org
      // so one org's event never reaches another org's admins.
      const orgUserIds = new Set(orgUsers.map((u) => u.id));
      const userIds = admins
        .filter((u) => orgUserIds.has(u.id))
        .map((u) => u.id);

      this.cache.set(orgId, {
        userIds,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return userIds;
    } catch (error) {
      this.logger.error(
        `Failed to resolve org admins for ${orgId}: ${String(error)}`,
      );
      return [];
    }
  }
}
