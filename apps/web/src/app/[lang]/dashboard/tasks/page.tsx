import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, canWrite } from '@/auth/permissions';
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

  const writeAccess = canWrite(role, 'tasks');

  return <TasksPage canWrite={writeAccess} />;
}
