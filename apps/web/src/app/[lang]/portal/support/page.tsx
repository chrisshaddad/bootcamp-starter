import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { PortalSupport } from '@/components/portal/portal-support';

export default async function PortalSupportPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const dict = await getDictionary(locale);

  return <PortalSupport locale={locale} dict={dict} />;
}
