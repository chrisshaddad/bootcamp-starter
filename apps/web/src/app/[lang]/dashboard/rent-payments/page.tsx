import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, canWrite } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { RentPaymentsPage } from '@/components/dashboard/rent-payments-page';

export default async function RentPaymentsPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  // maintenance + tenant have no access; supervisor is read-only.
  if (!canAccess(role, 'rentPayments')) {
    redirect(`/${locale}/dashboard`);
  }

  const dict = await getDictionary(locale);

  return (
    <RentPaymentsPage
      canWrite={canWrite(role, 'rentPayments')}
      locale={locale}
      dict={dict}
    />
  );
}
