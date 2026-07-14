import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { TasksPage } from '@/components/dashboard/tasks-page';

export default async function TasksPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'tasks')) {
    redirect(`/${locale}/dashboard`);
  }

  // Maintenance Request writes are org_admin only — 'tasks' is 'full' for
  // maintenance at the page-permission level, but that access doesn't
  // extend to MR create/edit/delete (enforced in MaintenanceRequestsService).
  return <TasksPage canWrite={role === 'org_admin'} locale={locale} />;
}
