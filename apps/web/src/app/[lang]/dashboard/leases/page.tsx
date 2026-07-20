import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, canWrite } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { LeasesPage } from '@/components/dashboard/leases-page';

export default async function LeasesPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'leases')) {
    // Match the sibling dashboard pages (buildings/invoices/reports/…), which
    // bounce an unauthorized role back to their own dashboard home.
    redirect(`/${locale}/dashboard`);
  }

  const dict = await getDictionary(locale);

  return (
    <LeasesPage
      locale={locale}
      dict={dict}
      canWrite={canWrite(role, 'leases')}
    />
  );
}
