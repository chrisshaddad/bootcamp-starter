/**
 * Single source of truth for the plan catalog.
 *
 * `fetchPlans()` fetches from `GET /plans` (public, revalidated hourly).
 * If the backend is unreachable or returns an error, the hardcoded FALLBACK
 * is returned so build/runtime never breaks.
 *
 * The shape mirrors the backend PlanDef (minus stripePriceId).
 */

import type { PlanKey } from '@/app/[lang]/(public)/_sections/pricing-section';

export type PlanDef = {
  key: PlanKey;
  displayName: string;
  nameAr: string;
  price: number;
  currency: string;
  buildingsLimit: number | null;
  usersLimit: number | null;
  highlighted?: boolean;
};

/** Hardcoded fallback — mirrors backend PLAN_CATALOG. Used when GET /plans fails. */
export const PLAN_CATALOG_FALLBACK: PlanDef[] = [
  {
    key: 'starter',
    displayName: 'Starter',
    nameAr: 'المبتدئ',
    price: 20,
    currency: 'usd',
    buildingsLimit: 3,
    usersLimit: 5,
    highlighted: false,
  },
  {
    key: 'growth',
    displayName: 'Growth',
    nameAr: 'النمو',
    price: 20,
    currency: 'usd',
    buildingsLimit: 5,
    usersLimit: 10,
    highlighted: true,
  },
  {
    key: 'pro',
    displayName: 'Pro',
    nameAr: 'الاحترافي',
    price: 20,
    currency: 'usd',
    buildingsLimit: null,
    usersLimit: null,
    highlighted: false,
  },
];

type BackendPlanShape = {
  key: string;
  displayName: string;
  price: number;
  currency: string;
  buildingsLimit: number | null;
  usersLimit: number | null;
  highlighted?: boolean;
};

const PLAN_KEYS: PlanKey[] = ['starter', 'growth', 'pro'];

export function isPlanKey(k: string): k is PlanKey {
  return (PLAN_KEYS as string[]).includes(k);
}

/** Arabic display names — not returned by the backend, enriched client-side. */
const AR_NAMES: Record<PlanKey, string> = {
  starter: 'المبتدئ',
  growth: 'النمو',
  pro: 'الاحترافي',
};

/**
 * Fetch the plan catalog from the backend.
 * Falls back to PLAN_CATALOG_FALLBACK on any error so the build always succeeds.
 *
 * Call only from Server Components / Route Handlers (uses `server-only`-compatible fetch).
 */
export async function fetchPlans(): Promise<PlanDef[]> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return PLAN_CATALOG_FALLBACK;
  }

  try {
    const res = await fetch(`${apiUrl}/plans`, {
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return PLAN_CATALOG_FALLBACK;
    }

    const raw = (await res.json()) as BackendPlanShape[];

    if (!Array.isArray(raw) || raw.length === 0) {
      return PLAN_CATALOG_FALLBACK;
    }

    const plans: PlanDef[] = raw
      .filter((p) => isPlanKey(p.key))
      .map((p) => ({
        key: p.key as PlanKey,
        displayName: p.displayName,
        nameAr: AR_NAMES[p.key as PlanKey] ?? p.displayName,
        price: p.price,
        currency: p.currency,
        buildingsLimit: p.buildingsLimit,
        usersLimit: p.usersLimit,
        highlighted: p.highlighted,
      }));

    return plans.length > 0 ? plans : PLAN_CATALOG_FALLBACK;
  } catch {
    return PLAN_CATALOG_FALLBACK;
  }
}

/** Look up a plan by key. Returns undefined if not found. */
export function getPlanByKey(
  plans: PlanDef[],
  key: PlanKey,
): PlanDef | undefined {
  return plans.find((p) => p.key === key);
}
