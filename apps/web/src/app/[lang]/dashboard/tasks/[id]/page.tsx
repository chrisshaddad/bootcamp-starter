import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
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

  const dict = await getDictionary(locale);

  // Work Order create/reassign/delete is org_admin only; maintenance may
  // only update status/resolutionNotes on a Work Order assigned to them
  // (enforced in WorkOrdersService) — neither is the plain 'tasks'
  // canWrite() value, which is 'full' for maintenance at the page level.
  return (
    <MaintenanceRequestDetailPage
      id={id}
      locale={locale}
      canWrite={role === 'org_admin'}
      isMaintenanceCaller={role === 'maintenance'}
      dict={dict}
    />
  );
}
