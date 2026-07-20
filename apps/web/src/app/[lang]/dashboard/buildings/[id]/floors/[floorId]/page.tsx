import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess, canWrite } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { FloorDetailPage } from '@/components/dashboard/floor-detail-page';

export default async function FloorDetailPageRoute({
  params,
}: {
  params: Promise<{ lang: string; id: string; floorId: string }>;
}) {
  const { lang, id, floorId } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'buildings')) {
    redirect(`/${locale}/dashboard`);
  }

  const writeAccess = canWrite(role, 'buildings');
  const dict = await getDictionary(locale);

  return (
    <FloorDetailPage
      buildingId={id}
      floorId={floorId}
      canWrite={writeAccess}
      locale={locale}
      dict={dict}
    />
  );
}
