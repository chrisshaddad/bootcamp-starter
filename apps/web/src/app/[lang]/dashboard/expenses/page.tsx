import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, canWrite } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { ExpensesPage } from '@/components/dashboard/expenses-page';

export default async function ExpensesPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'expenses')) {
    redirect(`/${locale}/dashboard`);
  }

  const writeAccess = canWrite(role, 'expenses');
  const dict = await getDictionary(locale);

  // Only org_admin can read Maintenance Requests/Work Orders (GET excludes
  // finance), so the work-order picker in the expense dialog is org_admin-only.
  return (
    <ExpensesPage
      canWrite={writeAccess}
      canLinkWorkOrder={role === 'org_admin'}
      dict={dict}
    />
  );
}
