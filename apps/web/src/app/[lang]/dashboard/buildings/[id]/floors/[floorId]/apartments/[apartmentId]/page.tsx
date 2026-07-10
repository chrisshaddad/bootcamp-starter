import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, canWrite } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { ApartmentDetailPage } from '@/components/dashboard/apartment-detail-page';

export default async function ApartmentDetailPageRoute({
  params,
}: {
  params: Promise<{
    lang: string;
    id: string;
    floorId: string;
    apartmentId: string;
  }>;
}) {
  const { lang, id, floorId, apartmentId } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'buildings')) {
    redirect(`/${locale}/dashboard`);
  }

  const writeAccess = canWrite(role, 'buildings');

  return (
    <ApartmentDetailPage
      buildingId={id}
      floorId={floorId}
      apartmentId={apartmentId}
      canWrite={writeAccess}
      locale={locale}
    />
  );
}
