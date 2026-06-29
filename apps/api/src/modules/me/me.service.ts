import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { pickPrimaryRole } from '@/common/enums';

@Injectable()
export class MeService {
  private readonly logger = new Logger(MeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
    private readonly timeline: TimelineService,
  ) {}

  /**
   * Resolve the caller's org/role, provisioning a fresh org on first login.
   * Keycloak is the source of truth: org membership is the `org_id` user
   * attribute and the role is a web-client role. The DB only holds the
   * Organization entity (name/status/billing).
   */
  async getOrProvision(user: AuthenticatedUser) {
    const profile = {
      id: user.sub,
      email: user.email ?? null,
      fullName: user.fullName ?? null,
    };

    // 1) Token already carries an org → return it if the Organization exists.
    if (user.orgId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: user.orgId },
      });
      if (org) {
        return {
          user: profile,
          org: { id: org.id, name: org.name, status: org.status },
          role: pickPrimaryRole(user.roles),
          orgId: org.id,
        };
      }
    }

    // 2) Provision-or-find, serialized per user so two racing /me requests
    //    (e.g. concurrent RSC renders right after registration) cannot create
    //    duplicate organisations. Role is NEVER granted here — the org_admin
    //    role is assigned only after a successful payment
    //    (BillingService.confirmSession / Stripe webhook).
    const orgId = await this.provisionOrgId(user);
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    return {
      user: profile,
      org: org
        ? { id: org.id, name: org.name, status: org.status }
        : { id: orgId, name: profile.email ?? '', status: 'PENDING' },
      role: pickPrimaryRole(user.roles),
      orgId,
    };
  }

  /**
   * Return the caller's orgId, creating an Organization on first call.
   * Wrapped in a transaction-scoped Postgres advisory lock keyed on the user's
   * Keycloak `sub`, so concurrent first-login requests are serialized: the first
   * creates the org + writes the `org_id` Keycloak attribute, and any waiter
   * then observes that attribute instead of creating a second org.
   */
  private async provisionOrgId(user: AuthenticatedUser): Promise<string> {
    return this.prisma.$transaction(
      async (tx) => {
        // Serialize concurrent provisioning for this user.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.sub}))`;

        // Re-check the Keycloak org_id attribute now that we hold the lock.
        const kcUser = await this.keycloakAdmin.getUser(user.sub);
        const attrOrgId = (
          kcUser?.attributes as Record<string, string[]> | undefined
        )?.org_id?.[0];
        if (attrOrgId) {
          const existing = await tx.organization.findUnique({
            where: { id: attrOrgId },
          });
          if (existing) return existing.id;
        }

        // First login: create the org and bind it to the user via the attribute.
        this.logger.log(`Provisioning new org for user ${user.sub}`);
        const orgName = user.email
          ? `${user.email.split('@')[0]}'s Organization`
          : `Organization ${user.sub.slice(0, 8)}`;

        const org = await tx.organization.create({
          data: { name: orgName, status: 'PENDING' },
        });

        await this.keycloakAdmin.setUserAttribute(user.sub, 'org_id', org.id);

        await this.timeline.emit({
          orgId: org.id,
          actorId: user.sub,
          action: 'org.provisioned',
          targetType: 'Organization',
          targetId: org.id,
          metadata: { orgName },
        });

        return org.id;
      },
      { timeout: 15000 },
    );
  }
}
