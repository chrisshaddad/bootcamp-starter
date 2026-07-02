'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { PlanDef } from '@/lib/plans';
import { PLAN_CATALOG_FALLBACK } from '@/lib/plans';
import { BuildingBar } from '@/components/plans/building-bar';

export type PlanKey = 'starter' | 'growth' | 'pro';

type Plan = {
  key: PlanKey;
  nameEn: string;
  nameAr: string;
  buildings: number | null;
  users: number | null;
  highlighted?: boolean;
};

type PricingSectionProps = {
  locale: string;
  title: string;
  sub: string;
  /**
   * Live plan catalog from GET /plans (RSC-fetched). Falls back to PLAN_CATALOG_FALLBACK from lib/plans.
   */
  plans?: PlanDef[];
  /**
   * Called when the user clicks "Choose this plan" on a card.
   */
  onChoosePlan?: (planKey: PlanKey) => void;
};

export function PricingSection({
  locale,
  title,
  sub,
  plans: plansProp,
  onChoosePlan,
}: PricingSectionProps) {
  const reduced = useReducedMotion();
  const isRtl = locale === 'ar';

  const mapToDisplay = (p: PlanDef): Plan => ({
    key: p.key,
    nameEn: p.displayName,
    nameAr: p.nameAr,
    buildings: p.buildingsLimit,
    users: p.usersLimit,
    highlighted: p.highlighted,
  });

  // Map fetched plans to internal Plan shape, falling back to SSOT fallback
  const PLANS: Plan[] =
    plansProp && plansProp.length > 0
      ? plansProp.map(mapToDisplay)
      : PLAN_CATALOG_FALLBACK.map(mapToDisplay);

  function handleChoose(key: PlanKey) {
    if (onChoosePlan) {
      onChoosePlan(key);
    }
  }

  const t = {
    perMo: isRtl ? '/شهر' : '/mo',
    choosePlan: isRtl ? 'اختر هذه الخطة' : 'Choose this plan',
    mostPopular: isRtl ? 'الأكثر طلباً' : 'Most popular',
    buildings: isRtl ? 'مبانٍ' : 'Buildings',
    staffUsers: isRtl ? 'مستخدمو الفريق' : 'Staff users',
    unlimited: isRtl ? 'غير محدود' : 'Unlimited',
    includedFeatures: isRtl
      ? [
          'مدفوعات Stripe مدمجة',
          'بوابة المستأجرين (قريباً)',
          'سجل النشاط الكامل',
          'دعم ثنائي اللغة AR + EN',
        ]
      : [
          'Stripe payments built-in',
          'Tenant portal (coming soon)',
          'Full activity timeline',
          'Bilingual AR + EN support',
        ],
  };

  return (
    <section
      id="plans"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="py-28"
      style={{ background: '#0D1B2A' }}
      aria-label={isRtl ? 'خطط الاشتراك' : 'Subscription plans'}
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* Section header */}
        <motion.div
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={
            reduced
              ? { duration: 0.15 }
              : { duration: 0.5, ease: [0.16, 1, 0.3, 1] as number[] }
          }
          className="mb-14 text-center"
        >
          {/* Eyebrow rule */}
          <div className="flex items-center justify-center gap-4 mb-5">
            <span
              aria-hidden="true"
              className="h-px flex-1 max-w-[80px]"
              style={{ background: 'rgba(201,163,91,0.3)' }}
            />
            <span
              className="text-xs font-semibold tracking-[0.2em] uppercase"
              style={{ color: '#C9A35B' }}
            >
              {isRtl ? 'الخطط' : 'Plans'}
            </span>
            <span
              aria-hidden="true"
              className="h-px flex-1 max-w-[80px]"
              style={{ background: 'rgba(201,163,91,0.3)' }}
            />
          </div>
          <h2
            className="text-balance text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: '#F5F0E8' }}
          >
            {title}
          </h2>
          <p
            className="mt-4 text-base max-w-md mx-auto"
            style={{ color: 'rgba(245,240,232,0.48)', lineHeight: 1.7 }}
          >
            {sub}
          </p>
        </motion.div>

        {/* 3-card grid */}
        <div className="grid gap-5 sm:grid-cols-3 items-stretch">
          {PLANS.map((plan, i) => {
            const isHighlighted = plan.highlighted;
            return (
              <motion.div
                key={plan.key}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={
                  reduced
                    ? { duration: 0.15 }
                    : {
                        duration: 0.55,
                        ease: [0.16, 1, 0.3, 1] as number[],
                        delay: i * 0.08,
                      }
                }
                className="relative flex flex-col rounded-2xl overflow-hidden"
                style={{
                  background: isHighlighted
                    ? 'linear-gradient(160deg, #1C2F42 0%, #142233 100%)'
                    : 'rgba(255,255,255,0.025)',
                  border: isHighlighted
                    ? '1px solid rgba(201,163,91,0.40)'
                    : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: isHighlighted
                    ? '0 0 40px rgba(201,163,91,0.08), 0 8px 32px rgba(0,0,0,0.3)'
                    : 'none',
                }}
              >
                {/* Most popular badge */}
                {isHighlighted && (
                  <div className="px-5 pt-4 pb-0" aria-label={t.mostPopular}>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide"
                      style={{
                        background: 'rgba(201,163,91,0.15)',
                        border: '1px solid rgba(201,163,91,0.35)',
                        color: '#E2C47A',
                      }}
                    >
                      {/* Subtle pulse dot */}
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: '#C9A35B' }}
                      />
                      {t.mostPopular}
                    </span>
                  </div>
                )}

                {/* Card body */}
                <div className="flex flex-col flex-1 p-6 pt-5 gap-6">
                  {/* Plan name + price */}
                  <div>
                    <p
                      className="text-xs font-semibold tracking-[0.15em] uppercase mb-2"
                      style={{
                        color: isHighlighted
                          ? '#C9A35B'
                          : 'rgba(245,240,232,0.4)',
                      }}
                    >
                      {isRtl ? plan.nameAr : plan.nameEn}
                    </p>
                    <div className="flex items-end gap-1">
                      <span
                        className="text-4xl font-extrabold tracking-tight"
                        style={{ color: '#F5F0E8' }}
                      >
                        $20
                      </span>
                      <span
                        className="mb-1.5 text-sm"
                        style={{ color: 'rgba(245,240,232,0.4)' }}
                      >
                        {t.perMo}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div
                    className="h-px"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                    aria-hidden="true"
                  />

                  {/* Value — Buildings */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-medium tracking-wide uppercase"
                        style={{ color: 'rgba(245,240,232,0.45)' }}
                      >
                        {t.buildings}
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: '#F5F0E8' }}
                      >
                        {plan.buildings === null ? t.unlimited : plan.buildings}
                      </span>
                    </div>
                    <BuildingBar
                      count={plan.buildings}
                      ariaLabel={`${plan.buildings ?? t.unlimited} ${t.buildings}`}
                    />
                  </div>

                  {/* Value — Staff users */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-medium tracking-wide uppercase"
                      style={{ color: 'rgba(245,240,232,0.45)' }}
                    >
                      {t.staffUsers}
                    </span>
                    <span
                      className="text-sm font-bold"
                      style={{
                        color: isHighlighted ? '#C9A35B' : '#F5F0E8',
                      }}
                    >
                      {plan.users === null ? t.unlimited : plan.users}
                    </span>
                  </div>

                  {/* Divider */}
                  <div
                    className="h-px"
                    style={{ background: 'rgba(255,255,255,0.07)' }}
                    aria-hidden="true"
                  />

                  {/* Shared features */}
                  <ul
                    className="space-y-2 flex-1"
                    aria-label={isRtl ? 'ما يشمله الاشتراك' : "What's included"}
                  >
                    {t.includedFeatures.map((feat) => (
                      <li
                        key={feat}
                        className="flex items-start gap-2.5 text-xs"
                        style={{ color: 'rgba(245,240,232,0.50)' }}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 13 13"
                          fill="none"
                          aria-hidden="true"
                          className="mt-0.5 flex-shrink-0"
                        >
                          <path
                            d="M2.5 6.5L5.5 9.5L10.5 3.5"
                            stroke="#C9A35B"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        {feat}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handleChoose(plan.key)}
                    className="mt-2 w-full rounded-lg py-3 text-sm font-semibold tracking-wide transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A35B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D1B2A]"
                    style={
                      isHighlighted
                        ? { background: '#C9A35B', color: '#0D1B2A' }
                        : {
                            background: 'rgba(201,163,91,0.08)',
                            border: '1px solid rgba(201,163,91,0.20)',
                            color: '#C9A35B',
                          }
                    }
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      if (isHighlighted) {
                        el.style.background = '#E2C47A';
                      } else {
                        el.style.background = 'rgba(201,163,91,0.14)';
                        el.style.borderColor = 'rgba(201,163,91,0.35)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLButtonElement;
                      if (isHighlighted) {
                        el.style.background = '#C9A35B';
                      } else {
                        el.style.background = 'rgba(201,163,91,0.08)';
                        el.style.borderColor = 'rgba(201,163,91,0.20)';
                      }
                    }}
                  >
                    {t.choosePlan}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Reassurance line */}
        <motion.p
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={
            reduced
              ? { duration: 0.15 }
              : { duration: 0.4, ease: 'easeOut', delay: 0.3 }
          }
          className="mt-10 text-center text-xs"
          style={{ color: 'rgba(245,240,232,0.3)' }}
        >
          {isRtl
            ? 'بلا التزام طويل الأمد · يمكنك الإلغاء في أي وقت · جميع المبالغ بالدولار الأمريكي'
            : 'No long-term commitment · Cancel anytime · All prices in USD'}
        </motion.p>
      </div>
    </section>
  );
}
