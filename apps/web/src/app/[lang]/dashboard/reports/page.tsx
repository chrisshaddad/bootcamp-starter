import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { ReportsPage } from '@/components/dashboard/reports-page';

export default async function ReportsPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  // Only org_admin and finance may access reports (supervisor/tenant blocked).
  if (!canAccess(role, 'reports')) {
    redirect(`/${locale}/dashboard`);
  }

  const dict = await getDictionary(locale);

  return <ReportsPage locale={locale} dict={dict} />;
}
