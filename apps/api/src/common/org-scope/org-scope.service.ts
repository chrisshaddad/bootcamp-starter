import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role, pickPrimaryRole } from '@/common/enums';
import { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';

export interface OrgContext {
  orgId: string;
  role: Role;
}

@Injectable()
export class OrgScopeService {
  constructor(private readonly keycloakAdmin: KeycloakAdminService) {}
  /**
   * Resolve the caller's organisation + role from the signed Keycloak token.
   * Keycloak is the source of truth: `org_id` is a token claim and the role
   * comes from the web-client roles. No DB lookup.
   * Throws ForbiddenException if the caller is not yet provisioned (no org_id)
   * or carries no recognised app role.
   */
  resolveForCaller(user: AuthenticatedUser): OrgContext {
    if (!user.orgId) {
      throw new ForbiddenException(
        'No organisation on your account. Call GET /me first to provision.',
      );
    }
    const role = pickPrimaryRole(user.roles);
    if (!role) {
      throw new ForbiddenException('No role assigned to your account.');
    }
    return { orgId: user.orgId, role };
  }

  /**
   * Resolve only the caller's organisation, WITHOUT requiring an app role. Used
   * by the pre-payment billing endpoints (checkout-session, confirm): a freshly
   * registered user has an `org_id` (set at provisioning) but NO role until
   * payment is confirmed — the role is the paywall, so requiring it here would
   * re-create the chicken-and-egg.
   *
   * The token claim is preferred, but a just-registered user's token was minted
   * BEFORE /me provisioned the org, so it may not carry `org_id` yet (and the
   * client-side token refresh that folds it in can race the Subscribe click).
   * Rather than 403, fall back to the authoritative `org_id` attribute on the
   * Keycloak user — /me writes it at provisioning time. This removes the need
   * for a pre-payment token refresh and the race it created.
   */
  async resolveOrgId(user: AuthenticatedUser): Promise<string> {
    if (user.orgId) {
      return user.orgId;
    }

    const kcUser = await this.keycloakAdmin.getUser(user.sub);
    const attrOrgId = (
      kcUser?.attributes as Record<string, string[]> | undefined
    )?.org_id?.[0];
    if (attrOrgId) {
      return attrOrgId;
    }

    throw new ForbiddenException(
      'No organisation on your account. Call GET /me first to provision.',
    );
  }

  /**
   * Assert that a resource belongs to the caller's org.
   * If resourceOrgId !== caller.orgId → ForbiddenException.
   */
  assertSameOrg(callerOrgId: string, resourceOrgId: string): void {
    if (callerOrgId !== resourceOrgId) {
      throw new ForbiddenException(
        'Access denied: resource does not belong to your organisation.',
      );
    }
  }

  /**
   * Build a Prisma `where` clause pre-scoped to the caller's org.
   */
  orgWhere(orgId: string): { orgId: string } {
    return { orgId };
  }

  /**
   * For TENANT role: additionally scope to the calling user's own records.
   */
  tenantWhere(
    orgId: string,
    userId: string,
  ): { orgId: string; actorId: string } {
    return { orgId, actorId: userId };
  }
}
