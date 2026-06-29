import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, getAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { PaymentsPage } from '@/components/dashboard/payments-page';

export default async function PaymentsPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  // maintenance and tenant cannot access payments
  if (!canAccess(role, 'payments')) {
    redirect(`/${locale}/dashboard`);
  }

  // supervisor gets read-only; admin + finance get full view
  const readonly = getAccess(role, 'payments') === 'readonly';

  return <PaymentsPage locale={locale} readonly={readonly} />;
}
