import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { BillingPageContent } from '@/components/dashboard/billing-page-content';

export default async function DashboardBillingPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);
  if (!canAccess(role, 'billing')) redirect(`/${locale}/dashboard`);
  const dict = await getDictionary(locale);
  return <BillingPageContent locale={locale} dict={dict} />;
}
