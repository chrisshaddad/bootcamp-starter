import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, canWrite } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { VendorsPage } from '@/components/dashboard/vendors-page';

export default async function VendorsPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'vendors')) {
    redirect(`/${locale}/dashboard`);
  }

  const writeAccess = canWrite(role, 'vendors');
  const dict = await getDictionary(locale);

  return <VendorsPage canWrite={writeAccess} dict={dict} />;
}
