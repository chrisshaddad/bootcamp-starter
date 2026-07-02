import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireSession } from '@/auth/guards';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { BillingShell } from '@/components/billing/billing-shell';
import { BillingConfirmOrchestrator } from '@/components/billing/billing-confirm-orchestrator';
import { SessionRefresher } from '@/components/auth/session-refresher';
import { Lock, Shield, Users, Building2 } from 'lucide-react';
import { serverEnv } from '@/lib/env';
import { fetchPlans, isPlanKey } from '@/lib/plans';
import type { MeResponse } from '@/types/api';
import type { PlanKey } from '@/app/[lang]/(public)/_sections/pricing-section';

async function fetchMe(accessToken: string): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${serverEnv.API_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as MeResponse | { data: MeResponse };
    return 'data' in json ? json.data : json;
  } catch {
    return null;
  }
}

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';

  const session = await requireSession({ locale });
  const token = session.accessToken;

  // Confirm-on-return takes precedence: if Stripe sent us back with a session_id,
  // always run the orchestrator (idempotent confirm + token refresh + redirect),
  // even if the webhook already flipped the org to ACTIVE. Must come BEFORE the
  // ACTIVE redirect so the token refresh that grants org_admin always happens.
  const sp = await searchParams;
  const rawSessionId = sp['session_id'];
  const sessionId = typeof rawSessionId === 'string' ? rawSessionId : undefined;
  if (sessionId) {
    return <BillingConfirmOrchestrator sessionId={sessionId} locale={locale} />;
  }

  // Provision org+membership (required so checkout has orgId from DB)
  let me: MeResponse | null = null;
  if (token) {
    me = await fetchMe(token);
  }

  // If org already ACTIVE, user paid — send them to the dashboard
  if (me?.org?.status === 'ACTIVE') {
    redirect(`/${locale}/dashboard`);
  }

  // A freshly-registered user's token was minted BEFORE /me provisioned the org,
  // so it carries no org_id claim yet. Checkout AND confirm resolve org_id from
  // the token (OrgScopeService.resolveOrgId), so force a one-time token refresh
  // now — before the user can reach "Subscribe" — to fold the org_id claim in.
  // Without it the very first checkout 403s ("No organisation on your account").
  const shouldRefreshOrgId = Boolean(me?.orgId && !session.orgId);

  // Read the fm_plan cookie (set when user clicked "Choose plan" on landing)
  const cookieStore = await cookies();
  const fmPlanCookie = cookieStore.get('fm_plan')?.value;
  const initialPlanKey: PlanKey | undefined =
    fmPlanCookie && isPlanKey(decodeURIComponent(fmPlanCookie))
      ? (decodeURIComponent(fmPlanCookie) as PlanKey)
      : undefined;
  // Note: do NOT delete the cookie here — cookies cannot be mutated during a
  // Server Component render (throws at runtime). It is short-lived (max-age 1800s)
  // and expires on its own; a lingering value simply re-pre-selects the last plan.

  // Fetch live plans catalog (falls back to hardcoded on error)
  const plans = await fetchPlans();

  const dict = await getDictionary(locale);

  const billing = dict.billing as Record<string, unknown>;
  const dashboard = dict.dashboard as Record<string, unknown>;

  const isRtl = locale === 'ar';

  // ── Value-prop items — communicate what the platform does, not price ──
  const featureItems = [
    {
      icon: Building2,
      label:
        (billing.featureBuildingsLabel as string) ??
        (isRtl ? 'إدارة المباني' : 'Building management'),
      desc:
        (billing.featureBuildingsDesc as string) ??
        (isRtl
          ? 'نظّم وحداتك وعقاراتك بالكامل'
          : 'Organise all your units and properties'),
    },
    {
      icon: Users,
      label:
        (billing.featureTeamLabel as string) ??
        (isRtl ? 'فريق معتمد على الأدوار' : 'Role-based team access'),
      desc:
        (billing.featureTeamDesc as string) ??
        (isRtl
          ? 'مشرف، مالية، صيانة — كل شخص يرى ما يحتاجه'
          : 'Supervisor, Finance, Maintenance — everyone sees what they need'),
    },
    {
      icon: Shield,
      label:
        (billing.featureSecureLabel as string) ??
        (isRtl ? 'مدفوعات آمنة عبر Stripe' : 'Stripe-secured payments'),
      desc:
        (billing.featureSecureDesc as string) ??
        (isRtl
          ? 'بيانات مدفوعاتك محمية ومعزولة تماماً'
          : 'Your payment data is encrypted and fully isolated'),
    },
  ];

  return (
    <main
      className="min-h-screen"
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ background: '#0D1B2A' }}
    >
      {/* Fold the freshly-provisioned org_id into the session token before checkout. */}
      <SessionRefresher shouldRefresh={shouldRefreshOrgId} />

      {/* ── Subtle ambient gradient — no teal, purely gold warmth ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 10%, rgba(201,163,91,0.06) 0%, transparent 60%),' +
            'radial-gradient(ellipse 50% 40% at 80% 90%, rgba(201,163,91,0.04) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 sm:py-20">
        {/* ── Page header ── */}
        <div className="mb-12 text-center">
          {/* Gold eyebrow */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <span
              aria-hidden="true"
              className="h-px flex-1 max-w-[60px]"
              style={{ background: 'rgba(201,163,91,0.28)' }}
            />
            <span
              className="text-[11px] font-semibold tracking-[0.2em] uppercase"
              style={{ color: '#C9A35B' }}
            >
              {(billing.eyebrow as string) ??
                (isRtl ? 'تفعيل مساحة العمل' : 'Activate workspace')}
            </span>
            <span
              aria-hidden="true"
              className="h-px flex-1 max-w-[60px]"
              style={{ background: 'rgba(201,163,91,0.28)' }}
            />
          </div>

          <h1
            className="text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: '#F5F0E8' }}
          >
            {(billing.activateWorkspace as string) ??
              (isRtl ? 'فعّل مساحة عملك' : 'Activate your workspace')}
          </h1>
          <p
            className="mt-3 text-sm max-w-md mx-auto leading-relaxed"
            style={{ color: 'rgba(245,240,232,0.48)' }}
          >
            {(billing.subtitle as string) ??
              (isRtl
                ? 'اختر خطتك وأكمل الدفع للبدء فوراً.'
                : 'Choose your plan and complete payment to get started immediately.')}
          </p>
        </div>

        {/* ── Two-column layout: left = value props, right = checkout ── */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.35fr] lg:gap-14 items-start">
          {/* ── Left panel — what you get ── */}
          <div className="space-y-8">
            {/* Feature list */}
            <div className="space-y-5">
              {featureItems.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-4">
                  {/* Icon bubble */}
                  <div
                    className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'rgba(201,163,91,0.10)',
                      border: '1px solid rgba(201,163,91,0.18)',
                    }}
                    aria-hidden="true"
                  >
                    <Icon className="h-4 w-4" style={{ color: '#C9A35B' }} />
                  </div>
                  <div>
                    <p
                      className="text-sm font-semibold mb-0.5"
                      style={{ color: '#F5F0E8' }}
                    >
                      {label}
                    </p>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: 'rgba(245,240,232,0.46)' }}
                    >
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div
              className="h-px"
              style={{ background: 'rgba(255,255,255,0.06)' }}
              aria-hidden="true"
            />

            {/* Trust line */}
            <p
              className="text-xs italic"
              style={{ color: 'rgba(245,240,232,0.32)' }}
            >
              {(billing.trustedBy as string) ??
                (isRtl
                  ? 'يثق به مديرو العقارات في منطقة الشرق الأوسط'
                  : 'Trusted by property managers across MENA')}
            </p>
          </div>

          {/* ── Right panel — plan selector + checkout ── */}
          <div className="space-y-4">
            {/* Checkout card */}
            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <BillingShell
                subscribeLabel={
                  (billing.subscribe as string) ??
                  (isRtl ? 'اشتراك' : 'Subscribe')
                }
                manageLabel={
                  (billing.manage as string) ??
                  (isRtl ? 'إدارة الفواتير' : 'Manage billing')
                }
                locale={locale}
                initialPlanKey={initialPlanKey}
                plans={plans}
              />
            </div>

            {/* Reassurance strip */}
            <div className="flex flex-col items-center gap-1.5">
              <p
                className="text-center text-xs"
                style={{ color: 'rgba(245,240,232,0.36)' }}
              >
                {(dashboard.noCommitment as string) ??
                  (isRtl
                    ? 'بلا التزام طويل الأمد. إلغاء في أي وقت.'
                    : 'No long-term commitment. Cancel anytime.')}
              </p>
              <div
                className="flex items-center gap-1.5 text-xs"
                style={{ color: 'rgba(245,240,232,0.28)' }}
              >
                <Lock className="h-3 w-3" aria-hidden="true" />
                <span>
                  {(dashboard.securedByStripe as string) ??
                    (isRtl
                      ? 'المدفوعات مؤمّنة بواسطة Stripe'
                      : 'Payments secured by Stripe')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
