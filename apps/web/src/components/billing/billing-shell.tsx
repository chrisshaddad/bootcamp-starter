'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';

import {
  useCreateCheckoutSessionMutation,
  useCreatePortalSessionMutation,
} from '@/store/api/endpoints/billing.api';

import type { PlanKey } from '@/app/[lang]/(public)/_sections/pricing-section';
import { PLAN_CATALOG_FALLBACK } from '@/lib/plans';
import type { PlanDef } from '@/lib/plans';
import { BuildingBar } from '@/components/plans/building-bar';

// ─── Stripe promise ──────────────────────────────────────────────────────────
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
);

// ─── Internal plan shape (for billing-shell display) ─────────────────────────
type PlanDisplay = {
  key: PlanKey;
  nameEn: string;
  nameAr: string;
  buildings: number | null;
  users: number | null;
  highlighted?: boolean;
};

// ─── Component props ─────────────────────────────────────────────────────────
type BillingShellProps = {
  subscribeLabel: string;
  manageLabel: string;
  locale: string;
  /** Pre-selected plan key — read from fm_plan cookie in the billing RSC */
  initialPlanKey?: PlanKey;
  /** Live plan catalog from GET /plans — falls back to SSOT fallback if omitted */
  plans?: PlanDef[];
};

export function BillingShell({
  subscribeLabel,
  manageLabel,
  locale,
  initialPlanKey = 'growth',
  plans: plansProp,
}: BillingShellProps) {
  const isRtl = locale === 'ar';

  const mapToDisplay = (p: PlanDef): PlanDisplay => ({
    key: p.key,
    nameEn: p.displayName,
    nameAr: p.nameAr,
    buildings: p.buildingsLimit,
    users: p.usersLimit,
    highlighted: p.highlighted,
  });

  // ── Derive plan list from prop or fall back to SSOT ─────────────────────────
  const PLANS: PlanDisplay[] =
    plansProp && plansProp.length > 0
      ? plansProp.map(mapToDisplay)
      : PLAN_CATALOG_FALLBACK.map(mapToDisplay);

  // ── Local state ─────────────────────────────────────────────────────────────
  const [selectedPlanKey, setSelectedPlanKey] =
    useState<PlanKey>(initialPlanKey);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // ── RTK Query ───────────────────────────────────────────────────────────────
  const [createCheckout, { isLoading: checkoutLoading }] =
    useCreateCheckoutSessionMutation();
  const [createPortal, { isLoading: portalLoading }] =
    useCreatePortalSessionMutation();

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function handleSubscribe(planKey: PlanKey) {
    const result = await createCheckout({ planKey, locale });
    if ('data' in result && result.data?.clientSecret) {
      setClientSecret(result.data.clientSecret);
    }
  }

  async function handleManage() {
    const result = await createPortal();
    if ('data' in result && result.data?.url) {
      window.location.href = result.data.url;
    }
  }

  // ── Translation strings ──────────────────────────────────────────────────────
  const t = {
    choosePlan: isRtl ? 'اختر هذه الخطة' : 'Choose this plan',
    mostPopular: isRtl ? 'الأكثر طلباً' : 'Most popular',
    buildings: isRtl ? 'المباني' : 'Buildings',
    staffUsers: isRtl ? 'أعضاء الفريق' : 'Staff users',
    unlimited: isRtl ? 'غير محدود' : 'Unlimited',
    selected: isRtl ? 'محدد' : 'Selected',
    perMonth: isRtl ? '/ شهر' : '/ mo',
    subscribe: subscribeLabel,
    manage: manageLabel,
  };

  // ── Stripe embedded checkout ────────────────────────────────────────────────
  if (clientSecret) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: '1px solid rgba(201,163,91,0.20)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <EmbeddedCheckoutProvider
          stripe={stripePromise}
          options={{ clientSecret }}
        >
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ── Plan selector cards ── */}
      <div
        className="grid gap-3 sm:grid-cols-3"
        role="radiogroup"
        aria-label={isRtl ? 'اختر خطتك' : 'Choose your plan'}
      >
        {PLANS.map((plan) => {
          const isSelected = plan.key === selectedPlanKey;
          const isHighlighted = plan.highlighted;

          return (
            <button
              key={plan.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setSelectedPlanKey(plan.key)}
              className="relative flex flex-col rounded-xl text-start transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A35B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
              style={{
                padding: '1rem',
                background: isSelected
                  ? 'linear-gradient(160deg, #1C2F42 0%, #142233 100%)'
                  : 'rgba(255,255,255,0.025)',
                border: isSelected
                  ? '1px solid rgba(201,163,91,0.45)'
                  : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isSelected
                  ? '0 0 28px rgba(201,163,91,0.08), 0 4px 16px rgba(0,0,0,0.25)'
                  : 'none',
              }}
            >
              {/* Most popular badge */}
              {isHighlighted && (
                <span
                  className="mb-2 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide"
                  style={{
                    background: 'rgba(201,163,91,0.15)',
                    border: '1px solid rgba(201,163,91,0.30)',
                    color: '#E2C47A',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: '#C9A35B' }}
                  />
                  {t.mostPopular}
                </span>
              )}

              {/* Plan name */}
              <p
                className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-1"
                style={{
                  color: isSelected ? '#C9A35B' : 'rgba(245,240,232,0.4)',
                }}
              >
                {isRtl ? plan.nameAr : plan.nameEn}
              </p>

              {/* Price */}
              <div className="flex items-end gap-1 mb-3">
                <span
                  className="text-2xl font-extrabold tracking-tight"
                  style={{ color: '#F5F0E8' }}
                >
                  $20
                </span>
                <span
                  className="mb-0.5 text-xs"
                  style={{ color: 'rgba(245,240,232,0.38)' }}
                >
                  {t.perMonth}
                </span>
              </div>

              {/* Divider */}
              <div
                className="h-px mb-3"
                style={{ background: 'rgba(255,255,255,0.06)' }}
                aria-hidden="true"
              />

              {/* Buildings */}
              <div className="space-y-1.5 mb-2">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-medium tracking-wide uppercase"
                    style={{ color: 'rgba(245,240,232,0.40)' }}
                  >
                    {t.buildings}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: '#F5F0E8' }}
                  >
                    {plan.buildings === null ? t.unlimited : plan.buildings}
                  </span>
                </div>
                <BuildingBar count={plan.buildings} />
              </div>

              {/* Staff users */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-medium tracking-wide uppercase"
                  style={{ color: 'rgba(245,240,232,0.40)' }}
                >
                  {t.staffUsers}
                </span>
                <span
                  className="text-xs font-bold"
                  style={{ color: isSelected ? '#C9A35B' : '#F5F0E8' }}
                >
                  {plan.users === null ? t.unlimited : plan.users}
                </span>
              </div>

              {/* Selected ring dot */}
              {isSelected && (
                <span
                  aria-hidden="true"
                  className="absolute top-3 end-3 h-2 w-2 rounded-full"
                  style={{ background: '#C9A35B' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Subscribe CTA ── */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSubscribe(selectedPlanKey)}
          disabled={checkoutLoading}
          className="w-full rounded-lg py-3.5 text-sm font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A35B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A] disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: '#C9A35B', color: '#0D1B2A' }}
          onMouseEnter={(e) => {
            if (!checkoutLoading)
              (e.currentTarget as HTMLButtonElement).style.background =
                '#E2C47A';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#C9A35B';
          }}
        >
          {checkoutLoading
            ? isRtl
              ? 'جارٍ التحميل…'
              : 'Loading…'
            : t.subscribe}
        </button>

        <button
          type="button"
          onClick={handleManage}
          disabled={portalLoading}
          className="w-full rounded-lg py-3 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A35B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A] disabled:opacity-60"
          style={{
            background: 'rgba(201,163,91,0.07)',
            border: '1px solid rgba(201,163,91,0.18)',
            color: '#C9A35B',
          }}
          onMouseEnter={(e) => {
            if (!portalLoading) {
              (e.currentTarget as HTMLButtonElement).style.background =
                'rgba(201,163,91,0.12)';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'rgba(201,163,91,0.07)';
          }}
        >
          {portalLoading ? (isRtl ? 'جارٍ التحميل…' : 'Loading…') : t.manage}
        </button>
      </div>
    </div>
  );
}
