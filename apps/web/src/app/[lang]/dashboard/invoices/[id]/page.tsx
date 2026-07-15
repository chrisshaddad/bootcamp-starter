import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, canWrite } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { InvoiceDetailPage } from '@/components/dashboard/invoice-detail-page';

export default async function InvoiceDetailPageRoute({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'invoices')) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <InvoiceDetailPage
      invoiceId={id}
      locale={locale}
      canWrite={canWrite(role, 'invoices')}
    />
  );
}
