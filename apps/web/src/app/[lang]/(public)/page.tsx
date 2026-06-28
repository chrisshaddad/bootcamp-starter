import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { FeaturesSection } from './_sections/features-section';
import {
  LandingHeroHandlers,
  LandingPricingHandlers,
} from '@/components/landing/landing-handlers';
import { fetchPlans } from '@/lib/plans';

export default async function LandingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const dict = await getDictionary(locale);
  const isAr = locale === 'ar';

  const plans = await fetchPlans();

  const t = {
    heroEyebrow: isAr
      ? 'منصة إدارة العقارات في الشرق الأوسط'
      : 'Real Estate Management · MENA',
    heroHeadline: isAr
      ? 'أدِر عقاراتك\nبثقة واحترافية'
      : 'Manage your portfolio\nwith precision',
    heroSub: isAr
      ? 'منصة متكاملة لإدارة المباني والمستأجرين والمدفوعات — مصممة لأصحاب العقارات في منطقة الشرق الأوسط وشمال أفريقيا.'
      : 'The all-in-one platform for property owners, agencies, and managers across the MENA region. Buildings, tenants, and payments — one roof.',
    heroSecondary: isAr ? 'تسجيل الدخول' : 'Log in',

    featuresTitle: isAr
      ? 'كل ما تحتاجه لإدارة محفظتك'
      : 'Built for serious property managers',
    featuresSub: isAr
      ? 'أدوات متكاملة تشغّل محفظتك العقارية من الألف إلى الياء.'
      : 'Purpose-built tools to run your real estate portfolio end-to-end.',

    pricingTitle: isAr
      ? 'اختر الخطة المناسبة لحجم محفظتك'
      : 'Pick the plan that fits your portfolio',
    pricingSub: isAr
      ? 'ثلاث خطط بسعر واحد — الفرق في حجم المحفظة التي تديرها.'
      : 'Three plans, one price — differentiated by the scale of portfolio you manage.',
  };

  const features = isAr
    ? [
        {
          icon: '🏢',
          title: 'مساحات عمل معزولة',
          desc: 'كل منظمة معزولة بالكامل. أنشئ محافظ مستقلة لكل عميل أو مشروع.',
        },
        {
          icon: '🔐',
          title: 'صلاحيات مبنية على الأدوار',
          desc: 'خمسة أدوار مدمجة — مالك، مدير، وكيل، مستأجر، ومحاسب — بصلاحيات دقيقة.',
        },
        {
          icon: '🏠',
          title: 'بوابة المستأجر',
          desc: 'بوابة مخصصة للمستأجرين لتتبع العقود والمدفوعات وطلبات الصيانة.',
        },
        {
          icon: '💳',
          title: 'مدفوعات آمنة عبر Stripe',
          desc: 'استقبل الإيجارات إلكترونياً مع تقارير تلقائية وتتبع كامل للمدفوعات.',
        },
      ]
    : [
        {
          icon: '🏢',
          title: 'Multi-org workspaces',
          desc: 'Create isolated organizations for each portfolio or client. Your data never crosses boundaries.',
        },
        {
          icon: '🔐',
          title: 'Role-based access',
          desc: 'Five built-in roles — Owner, Manager, Agent, Tenant, Accountant — with granular permissions.',
        },
        {
          icon: '🏠',
          title: 'Tenant portal',
          desc: 'A self-service portal where tenants track contracts, payments, and maintenance requests.',
        },
        {
          icon: '💳',
          title: 'Payments via Stripe',
          desc: 'Collect rent online with automatic receipts, reconciliation reports, and payout tracking.',
        },
      ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero — client wrapper provides onLogin handler */}
      <LandingHeroHandlers
        locale={locale}
        eyebrow={t.heroEyebrow}
        headline={t.heroHeadline}
        sub={t.heroSub}
        ctaLabel={dict.auth.getStarted}
        secondaryLabel={t.heroSecondary}
      />

      {/* Features — pure presentation, no auth handlers needed */}
      <FeaturesSection
        locale={locale}
        title={t.featuresTitle}
        sub={t.featuresSub}
        features={features}
      />

      {/* Pricing — client wrapper provides onChoosePlan handler + live plans data */}
      <LandingPricingHandlers
        locale={locale}
        title={t.pricingTitle}
        sub={t.pricingSub}
        plans={plans}
      />

      {/* Footer */}
      <footer
        style={{
          background: '#0A1526',
          borderTop: '1px solid rgba(201,163,91,0.12)',
        }}
        className="py-10"
      >
        <div className="mx-auto max-w-6xl px-6 flex flex-col items-center gap-2 text-center">
          <span
            className="text-sm font-semibold tracking-[0.15em] uppercase"
            style={{ color: 'rgba(201,163,91,0.75)' }}
          >
            {dict.app.name}
          </span>
          <span className="text-sm" style={{ color: 'rgba(245,240,232,0.35)' }}>
            {dict.app.tagline}
          </span>
          <span
            className="text-xs mt-1"
            style={{ color: 'rgba(245,240,232,0.2)' }}
          >
            &copy; {new Date().getFullYear()} Forward Mena.{' '}
            {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}
          </span>
        </div>
      </footer>
    </div>
  );
}
