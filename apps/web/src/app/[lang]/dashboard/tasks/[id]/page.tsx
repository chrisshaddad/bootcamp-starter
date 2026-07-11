import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { MaintenanceRequestDetailPage } from '@/components/dashboard/maintenance-request-detail-page';

export default async function MaintenanceRequestDetailPageRoute({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'tasks')) {
    redirect(`/${locale}/dashboard`);
  }

  return <MaintenanceRequestDetailPage id={id} locale={locale} />;
}
