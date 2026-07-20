import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, canWrite } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { InvoicesPage } from '@/components/dashboard/invoices-page';

export default async function InvoicesPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'invoices')) {
    redirect(`/${locale}/dashboard`);
  }

  const dict = await getDictionary(locale);

  return (
    <InvoicesPage
      canWrite={canWrite(role, 'invoices')}
      locale={locale}
      dict={dict}
    />
  );
}
