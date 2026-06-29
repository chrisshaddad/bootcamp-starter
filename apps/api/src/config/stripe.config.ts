import { registerAs } from '@nestjs/config';

export const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY ?? '',
  priceId: process.env.STRIPE_PRICE_ID ?? '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
}));
