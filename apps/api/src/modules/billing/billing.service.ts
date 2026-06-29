import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { StripeService } from './stripe.service';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { getPlan, PlanKey } from './plan-catalog';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
    private readonly keycloakAdmin: KeycloakAdminService,
    private readonly timeline: TimelineService,
  ) {}

  async getSubscription(orgId: string) {
    return this.prisma.subscription.findUnique({ where: { orgId } });
  }

  async createCheckoutSession(
    orgId: string,
    user: AuthenticatedUser,
    planKey: PlanKey,
    locale = 'en',
  ) {
    const plan = getPlan(planKey);
    if (!plan) {
      throw new BadRequestException(`Unknown plan: ${planKey}`);
    }

    let org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org) throw new NotFoundException('Organisation not found.');

    let customerId = org.stripeCustomerId;
    if (!customerId) {
      customerId = await this.stripe.findOrCreateCustomer(
        orgId,
        user.email,
        user.fullName,
      );
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { stripeCustomerId: customerId },
      });
    }

    const frontendUrl = this.config.getOrThrow<string>('app.frontendUrl');
    // Resolve priceId: per-plan override or env fallback
    const priceId = plan.stripePriceId;
    return this.stripe.createSubscriptionCheckoutSession({
      orgId,
      customerId,
      planKey,
      returnUrl: frontendUrl,
      locale,
      priceId,
    });
  }

  /**
   * Confirm a completed Stripe checkout session:
   *   1. Retrieve + validate session (paid, orgId matches caller).
   *   2. Activate org, upsert Subscription with planKey, assign the org_admin
   *      Keycloak CLIENT role (Keycloak is the source of truth for roles).
   *   3. Idempotent — safe to call multiple times.
   * This is the point where the org_admin role is granted: register → pay →
   * role → dashboard. The role is never granted before a successful payment.
   */
  async confirmSession(
    callerOrgId: string,
    callerSub: string,
    sessionId: string,
  ): Promise<{ status: string; planKey: string; role: string }> {
    const session = await this.stripe.retrieveCheckoutSession(sessionId);

    if (session.payment_status !== 'paid') {
      throw new HttpException(
        `Payment not yet completed (status: ${session.payment_status}). Complete payment before confirming.`,
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const metaOrgId = session.metadata?.orgId;
    if (!metaOrgId || metaOrgId !== callerOrgId) {
      throw new ForbiddenException(
        'Session does not belong to your organisation.',
      );
    }

    const planKey = (session.metadata?.planKey ?? 'starter') as PlanKey;
    const customerId =
      typeof session.customer === 'string' ? session.customer : null;
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : null;

    // Activate org
    await this.prisma.organization.update({
      where: { id: callerOrgId },
      data: {
        status: 'ACTIVE',
        ...(customerId ? { stripeCustomerId: customerId } : {}),
      },
    });

    // Upsert subscription with planKey
    await this.prisma.subscription.upsert({
      where: { orgId: callerOrgId },
      create: {
        orgId: callerOrgId,
        stripeSubscriptionId: subscriptionId ?? undefined,
        stripeCustomerId: customerId ?? undefined,
        status: 'ACTIVE',
        planKey,
      },
      update: {
        stripeSubscriptionId: subscriptionId ?? undefined,
        stripeCustomerId: customerId ?? undefined,
        status: 'ACTIVE',
        planKey,
      },
    });

    // Grant the org_admin CLIENT role — the single source of truth for roles.
    // This is the ONLY place an org owner becomes org_admin (post-payment).
    try {
      await this.keycloakAdmin.setSingleClientRole(callerSub, Role.ORG_ADMIN);
    } catch (error) {
      this.logger.error(
        `confirmSession: failed to assign org_admin role to ${callerSub}: ${String(error)}`,
      );
      throw error;
    }

    await this.timeline.emit({
      orgId: callerOrgId,
      actorId: callerSub,
      action: 'billing.confirmed',
      targetType: 'Subscription',
      metadata: { sessionId, planKey },
    });

    this.logger.log(
      `confirmSession: org ${callerOrgId} activated, plan=${planKey}, user=${callerSub}`,
    );

    return { status: 'active', planKey, role: 'org_admin' };
  }

  async createPortalSession(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });
    if (!org?.stripeCustomerId) {
      throw new NotFoundException(
        'No Stripe customer found for this org. Complete checkout first.',
      );
    }
    const frontendUrl = this.config.getOrThrow<string>('app.frontendUrl');
    return this.stripe.createBillingPortalSession({
      customerId: org.stripeCustomerId,
      returnUrl: `${frontendUrl}/billing`,
    });
  }
}
