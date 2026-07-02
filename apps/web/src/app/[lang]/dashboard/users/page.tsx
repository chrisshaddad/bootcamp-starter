import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { UsersPage } from '@/components/dashboard/users-page';
import { getDictionary } from '@/i18n/get-dictionary';
import { isLocale } from '@/i18n/config';

export default async function UsersPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  // finance and maintenance cannot access this page at all
  if (!canAccess(role, 'users')) {
    redirect(`/${locale}/dashboard`);
  }

  const dict = await getDictionary(locale);

  // supervisor gets read-only view; org_admin gets full CRUD
  const readonly = role !== 'org_admin';

  return (
    <UsersPage
      locale={locale}
      dict={dict as Record<string, unknown>}
      readonly={readonly}
    />
  );
}
