'use client';

/**
 * Thin client wrappers that provide signIn-based handlers to the landing
 * sections (HeroSection + PricingSection), which are themselves client
 * components but receive handlers as props so the RSC page.tsx stays
 * a server component.
 *
 * LandingHeroHandlers:
 *   onLogin → signIn("keycloak", { callbackUrl: "/{locale}/dashboard" })
 *
 * LandingPricingHandlers:
 *   onChoosePlan(planKey) → set fm_plan cookie (30 min, SameSite=Lax) then
 *     signIn("keycloak", { callbackUrl: "/{locale}/billing" })
 */

import { signIn } from 'next-auth/react';
import { HeroSection } from '@/app/[lang]/(public)/_sections/hero-section';
import { PricingSection } from '@/app/[lang]/(public)/_sections/pricing-section';
import type { PlanKey } from '@/app/[lang]/(public)/_sections/pricing-section';
import type { PlanDef } from '@/lib/plans';

// ── Hero ─────────────────────────────────────────────────────────────────────

type LandingHeroHandlersProps = {
  locale: string;
  eyebrow: string;
  headline: string;
  sub: string;
  ctaLabel: string;
  secondaryLabel: string;
};

export function LandingHeroHandlers({
  locale,
  eyebrow,
  headline,
  sub,
  ctaLabel,
  secondaryLabel,
}: LandingHeroHandlersProps) {
  function handleLogin() {
    void signIn('keycloak', { callbackUrl: `/${locale}/dashboard` });
  }

  return (
    <HeroSection
      locale={locale}
      eyebrow={eyebrow}
      headline={headline}
      sub={sub}
      ctaLabel={ctaLabel}
      secondaryLabel={secondaryLabel}
      onLogin={handleLogin}
    />
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────

type LandingPricingHandlersProps = {
  locale: string;
  title: string;
  sub: string;
  plans: PlanDef[];
};

export function LandingPricingHandlers({
  locale,
  title,
  sub,
  plans,
}: LandingPricingHandlersProps) {
  function handleChoosePlan(planKey: PlanKey) {
    // Set short-lived cookie (30 min) so /billing RSC can pre-select the plan
    document.cookie = [
      `fm_plan=${encodeURIComponent(planKey)}`,
      'path=/',
      'max-age=1800',
      'SameSite=Lax',
    ].join('; ');

    void signIn('keycloak', { callbackUrl: `/${locale}/billing` });
  }

  return (
    <PricingSection
      locale={locale}
      title={title}
      sub={sub}
      onChoosePlan={handleChoosePlan}
      plans={plans}
    />
  );
}
