import { registerAs } from '@nestjs/config';

export const stripeConfig = registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY ?? '',
  // Fallback single price — also validated as recurring on boot (StripeService).
  priceId: process.env.STRIPE_PRICE_ID ?? '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  // Per-plan recurring prices. Empty string ⇒ that plan falls back to priceId.
  prices: {
    starter: process.env.STRIPE_PRICE_STARTER ?? '',
    growth: process.env.STRIPE_PRICE_GROWTH ?? '',
    pro: process.env.STRIPE_PRICE_PRO ?? '',
  } as Record<string, string>,
}));
