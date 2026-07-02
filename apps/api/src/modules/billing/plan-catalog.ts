/**
 * PLAN CATALOG — single source of truth for plan definitions.
 *
 * All stripePriceId fields are intentionally undefined here so all plans
 * fall back to the env STRIPE_PRICE_ID. This is the seam for the future
 * Stripe account: set distinct price ids per plan when ready, and this
 * file is the only place that needs to change.
 */

export type PlanKey = 'starter' | 'growth' | 'pro';

export interface PlanDef {
  key: PlanKey;
  displayName: string;
  /** Price in the given currency per billing period (e.g. 20 = $20). */
  price: number;
  currency: string;
  /** Max buildings allowed. null = unlimited. */
  buildingsLimit: number | null;
  /** Max staff users (SUPERVISOR + FINANCE + MAINTENANCE). null = unlimited. */
  usersLimit: number | null;
  /** Per-plan Stripe price id. undefined = fall back to env STRIPE_PRICE_ID. */
  stripePriceId?: string;
  /** Mark this card as "most popular" on the FE plan selector. */
  highlighted?: boolean;
}

export const PLAN_CATALOG: Record<PlanKey, PlanDef> = {
  starter: {
    key: 'starter',
    displayName: 'Starter',
    price: 20,
    currency: 'usd',
    buildingsLimit: 3,
    usersLimit: 5,
    // stripePriceId: undefined — falls back to env STRIPE_PRICE_ID
  },
  growth: {
    key: 'growth',
    displayName: 'Growth',
    price: 20,
    currency: 'usd',
    buildingsLimit: 5,
    usersLimit: 10,
    highlighted: true,
    // stripePriceId: undefined — falls back to env STRIPE_PRICE_ID
  },
  pro: {
    key: 'pro',
    displayName: 'Pro',
    price: 20,
    currency: 'usd',
    buildingsLimit: null,
    usersLimit: null,
    // stripePriceId: undefined — falls back to env STRIPE_PRICE_ID
  },
};

/** Look up a plan by key. Returns undefined if the key is unknown. */
export function getPlan(key: string): PlanDef | undefined {
  return PLAN_CATALOG[key as PlanKey];
}

/** Type guard: returns true if x is a valid PlanKey. */
export function isPlanKey(x: unknown): x is PlanKey {
  return typeof x === 'string' && x in PLAN_CATALOG;
}

/** Public plan list — strips stripePriceId so it is never sent to clients. */
export function listPublicPlans(): Omit<PlanDef, 'stripePriceId'>[] {
  return Object.values(PLAN_CATALOG).map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ stripePriceId: _omit, ...rest }) => rest,
  );
}
