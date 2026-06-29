import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PlanKey } from './plan-catalog';

function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, { apiVersion: '2025-04-30.basil' as never });
}

@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  private readonly priceId: string;
  private readonly webhookSecret: string;
  private readonly isProduction: boolean;
  readonly stripe: ReturnType<typeof createStripeClient>;

  constructor(private readonly configService: ConfigService) {
    this.priceId = this.configService.getOrThrow<string>('stripe.priceId');
    this.webhookSecret =
      this.configService.get<string>('stripe.webhookSecret') ?? '';
    this.isProduction =
      this.configService.get<string>('app.nodeEnv') === 'production';
    this.stripe = createStripeClient(
      this.configService.getOrThrow<string>('stripe.secretKey'),
    );
  }

  async onModuleInit() {
    try {
      const price = await this.stripe.prices.retrieve(this.priceId);
      if (price.type !== 'recurring') {
        this.logger.error(
          `STRIPE_PRICE_ID ${this.priceId} is type '${price.type}' — expected 'recurring'. Subscription checkout will fail.`,
        );
      } else {
        this.logger.log(
          `Stripe recurring price OK: ${this.priceId} (${price.currency} ${(price.unit_amount ?? 0) / 100}/mo)`,
        );
      }
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /** Find or create a Stripe Customer for an org. */
  async findOrCreateCustomer(
    orgId: string,
    email?: string,
    name?: string,
  ): Promise<string> {
    try {
      // Try to find existing customer by org metadata
      const existing = await this.stripe.customers.search({
        query: `metadata['orgId']:'${orgId}'`,
        limit: 1,
      });
      if (existing.data.length) {
        return existing.data[0].id;
      }
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: { orgId },
      });
      return customer.id;
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /** Create an embedded subscription checkout session. */
  async createSubscriptionCheckoutSession(options: {
    orgId: string;
    customerId: string;
    planKey: PlanKey;
    returnUrl: string;
    locale?: string;
    /** Override per-plan price id. Falls back to env STRIPE_PRICE_ID when undefined. */
    priceId?: string;
  }): Promise<{ clientSecret: string }> {
    try {
      const resolvedPriceId = options.priceId ?? this.priceId;
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        ui_mode: 'embedded' as never,
        customer: options.customerId,
        line_items: [{ price: resolvedPriceId, quantity: 1 }],
        metadata: { orgId: options.orgId, planKey: options.planKey },
        return_url: `${options.returnUrl}/${options.locale ?? 'en'}/billing?session_id={CHECKOUT_SESSION_ID}`,
      });
      if (!session.client_secret) {
        throw new BadGatewayException('Stripe did not return a client_secret.');
      }
      return { clientSecret: session.client_secret };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /**
   * Retrieve a checkout session with metadata and payment_status expanded.
   * Used by POST /billing/confirm to verify payment and extract planKey.
   */
  async retrieveCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      });
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /** Create a Billing Portal session. */
  async createBillingPortalSession(options: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }> {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: options.customerId,
        return_url: options.returnUrl,
      });
      return { url: session.url };
    } catch (error) {
      throw this.toHttpException(error);
    }
  }

  /** Verify + parse a Stripe webhook event. */
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    if (!this.webhookSecret) {
      // Fail closed in production: with no secret we cannot verify the signature,
      // so an empty secret would let anyone POST forged events to the public
      // /webhooks/stripe endpoint (org activation, org_admin grants). Only allow
      // the unverified parse outside production for local webhook testing.
      if (this.isProduction) {
        throw new InternalServerErrorException({
          code: 'STRIPE_WEBHOOK_NOT_CONFIGURED',
          message: 'Stripe webhook secret is not configured.',
        });
      }
      this.logger.warn(
        '*** DEV ONLY: STRIPE_WEBHOOK_SECRET is empty — parsing webhook unverified! DO NOT use in production. ***',
      );
      return JSON.parse(rawBody.toString()) as Stripe.Event;
    }
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }

  private toHttpException(error: unknown) {
    if (error instanceof Stripe.errors.StripeError) {
      return new BadGatewayException({
        code: error.code ?? 'STRIPE_ERROR',
        message: error.message,
        type: error.type,
      });
    }
    if (error instanceof Error) {
      return new BadGatewayException({
        code: 'STRIPE_ERROR',
        message: error.message,
      });
    }
    return new BadGatewayException({
      code: 'STRIPE_ERROR',
      message: 'Stripe request failed.',
    });
  }
}
