import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, canWrite } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { RentersPage } from '@/components/dashboard/renters-page';

export default async function RentersPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'buildings')) {
    redirect(`/${locale}/dashboard`);
  }

  const writeAccess = canWrite(role, 'buildings');
  const dict = await getDictionary(locale);

  return <RentersPage canWrite={writeAccess} locale={locale} dict={dict} />;
}
