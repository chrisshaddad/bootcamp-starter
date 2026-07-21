import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { PortalAvailableUnits } from '@/components/portal/portal-available-units';

export default async function PortalAvailableUnitsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const dict = await getDictionary(locale);

  return <PortalAvailableUnits locale={locale} dict={dict} />;
}
