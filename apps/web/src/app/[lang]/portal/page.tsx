import { requireSession } from '@/auth/guards';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { serverEnv } from '@/lib/env';
import { PortalHome } from '@/components/portal/portal-home';
import type { MeResponse } from '@/types/api';

async function fetchMe(accessToken: string): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${serverEnv.API_URL}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = (await res.json()) as MeResponse | { data: MeResponse };
    return 'data' in json ? json.data : json;
  } catch {
    return null;
  }
}

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const dict = await getDictionary(locale);

  const session = await requireSession({ locale });
  const userName = session.user?.name ?? session.user?.email ?? '';

  let me: MeResponse | null = null;
  if (session.accessToken) {
    me = await fetchMe(session.accessToken);
  }

  return <PortalHome me={me} userName={userName} locale={locale} dict={dict} />;
}
