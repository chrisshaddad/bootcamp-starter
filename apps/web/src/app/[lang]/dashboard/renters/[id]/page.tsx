import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { RenterDetailPage } from '@/components/dashboard/renter-detail-page';

export default async function RenterDetailPageRoute({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'buildings')) {
    redirect(`/${locale}/dashboard`);
  }

  return <RenterDetailPage renterId={id} />;
}
