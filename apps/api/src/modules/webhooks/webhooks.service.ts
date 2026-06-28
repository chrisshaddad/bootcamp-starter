import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { Role } from '@/common/enums';
import type Stripe from 'stripe';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly keycloakAdmin: KeycloakAdminService,
  ) {}

  async handleEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Stripe webhook: ${event.type} (${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpsert(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async resolveOrgId(opts: {
    metadata?: Stripe.Metadata | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  }): Promise<string | null> {
    if (opts.metadata?.orgId) return opts.metadata.orgId;

    if (opts.stripeCustomerId) {
      const org = await this.prisma.organization.findFirst({
        where: { stripeCustomerId: opts.stripeCustomerId },
      });
      if (org) return org.id;
    }

    if (opts.stripeSubscriptionId) {
      const sub = await this.prisma.subscription.findFirst({
        where: { stripeSubscriptionId: opts.stripeSubscriptionId },
      });
      if (sub) return sub.orgId;
    }

    return null;
  }

  private mapSubscriptionStatus(status: string): string {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'ACTIVE';
      case 'past_due':
        return 'PAST_DUE';
      case 'canceled':
      case 'unpaid':
        return 'CANCELED';
      default:
        return 'PENDING';
    }
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const orgId = await this.resolveOrgId({
      metadata: session.metadata,
      stripeCustomerId:
        typeof session.customer === 'string' ? session.customer : null,
    });
    if (!orgId) {
      this.logger.warn(`checkout.session.completed: cannot resolve orgId`);
      return;
    }

    const customerId =
      typeof session.customer === 'string' ? session.customer : null;
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : null;
    const planKey = session.metadata?.planKey ?? null;

    // Persist customerId on org and activate
    if (customerId) {
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { stripeCustomerId: customerId, status: 'ACTIVE' },
      });
    }

    if (subscriptionId) {
      await this.prisma.subscription.upsert({
        where: { orgId },
        create: {
          orgId,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId ?? undefined,
          status: 'ACTIVE',
          ...(planKey ? { planKey } : {}),
        },
        update: {
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId ?? undefined,
          status: 'ACTIVE',
          ...(planKey ? { planKey } : {}),
        },
      });
    }

    // Idempotent backstop: ensure the org has an org_admin (provisioning already
    // assigns it). If the sole org member somehow lacks the role, promote them.
    try {
      const orgUsers = await this.keycloakAdmin.searchUsersByOrg(orgId);
      const adminIds = new Set(
        (await this.keycloakAdmin.getUsersWithClientRole(Role.ORG_ADMIN)).map(
          (u) => u.id,
        ),
      );
      const hasAdmin = orgUsers.some((u) => adminIds.has(u.id));
      if (!hasAdmin && orgUsers.length === 1) {
        await this.keycloakAdmin.setSingleClientRole(
          orgUsers[0].id,
          Role.ORG_ADMIN,
        );
        this.logger.log(
          `checkout.completed: backstop assigned org_admin to ${orgUsers[0].id} for org ${orgId}`,
        );
      } else if (!hasAdmin) {
        this.logger.warn(
          `checkout.completed: no org_admin found for org ${orgId} (${orgUsers.length} members) — skipping`,
        );
      }
    } catch (error) {
      // Do not fail the webhook on KC errors — log and continue.
      this.logger.error(
        `checkout.completed: org_admin backstop failed for org ${orgId}: ${String(error)}`,
      );
    }

    await this.timeline.emit({
      orgId,
      action: 'checkout.completed',
      targetType: 'Subscription',
      metadata: { sessionId: session.id, planKey },
    });
  }

  private async handleSubscriptionUpsert(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const orgId = await this.resolveOrgId({
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : null,
      stripeSubscriptionId: subscription.id,
    });
    if (!orgId) {
      this.logger.warn(`subscription event: cannot resolve orgId`);
      return;
    }

    const status = this.mapSubscriptionStatus(subscription.status);
    // current_period_end removed in Stripe v22 basil API; fall back to billing_cycle_anchor
    const periodEndRaw =
      (subscription as any).current_period_end ??
      (subscription as any).billing_cycle_anchor ??
      null;
    const currentPeriodEnd = periodEndRaw
      ? new Date(periodEndRaw * 1000)
      : null;
    const priceId = subscription.items.data[0]?.price.id ?? null;
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : null;

    await this.prisma.subscription.upsert({
      where: { orgId },
      create: {
        orgId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId ?? undefined,
        status,
        priceId: priceId ?? undefined,
        currentPeriodEnd,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        status,
        priceId: priceId ?? undefined,
        currentPeriodEnd,
      },
    });

    // Sync org status
    const orgStatus =
      status === 'ACTIVE'
        ? 'ACTIVE'
        : status === 'PAST_DUE'
          ? 'PAST_DUE'
          : 'CANCELED';
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { status: orgStatus as any },
    });

    await this.timeline.emit({
      orgId,
      action: `subscription.${subscription.status}`,
      targetType: 'Subscription',
      targetId: subscription.id,
      metadata: { status: subscription.status },
    });
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const orgId = await this.resolveOrgId({
      stripeCustomerId:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : null,
      stripeSubscriptionId: subscription.id,
    });
    if (!orgId) return;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: 'CANCELED' },
    });
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { status: 'CANCELED' },
    });
    await this.timeline.emit({
      orgId,
      action: 'subscription.canceled',
      targetType: 'Subscription',
      targetId: subscription.id,
    });
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId =
      typeof (invoice as any).subscription === 'string'
        ? (invoice as any).subscription
        : null;
    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : null;

    const orgId = await this.resolveOrgId({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    });
    if (!orgId) {
      this.logger.warn(
        `invoice.paid: cannot resolve orgId for invoice ${invoice.id}`,
      );
      return;
    }

    // Idempotent by stripeInvoiceId
    await this.prisma.payment.upsert({
      where: { stripeInvoiceId: invoice.id ?? 'unknown' },
      create: {
        orgId,
        stripeInvoiceId: invoice.id ?? undefined,
        amount: (invoice.amount_paid ?? 0) / 100,
        currency: invoice.currency ?? 'usd',
        status: 'PAID',
        paidAt: new Date(),
        rawPayload: invoice as any,
      },
      update: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    await this.timeline.emit({
      orgId,
      action: 'payment.paid',
      targetType: 'Payment',
      metadata: {
        invoiceId: invoice.id,
        amount: (invoice.amount_paid ?? 0) / 100,
        currency: invoice.currency,
      },
    });
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subscriptionId =
      typeof (invoice as any).subscription === 'string'
        ? (invoice as any).subscription
        : null;
    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : null;

    const orgId = await this.resolveOrgId({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
    });
    if (!orgId) return;

    await this.prisma.payment.upsert({
      where: { stripeInvoiceId: invoice.id ?? 'unknown' },
      create: {
        orgId,
        stripeInvoiceId: invoice.id ?? undefined,
        amount: (invoice.amount_due ?? 0) / 100,
        currency: invoice.currency ?? 'usd',
        status: 'FAILED',
        rawPayload: invoice as any,
      },
      update: { status: 'FAILED' },
    });

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { status: 'PAST_DUE' },
    });

    await this.timeline.emit({
      orgId,
      action: 'payment.failed',
      targetType: 'Payment',
      metadata: { invoiceId: invoice.id },
    });
  }
}
