import { requireSession } from '@/auth/guards';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { NotificationsPage } from '@/components/dashboard/notifications-page';

// The notification inbox is personal — every authenticated dashboard user has
// one (mirrors the header bell, which is shown for all roles), so there is no
// per-area permission gate beyond requiring a session.
export default async function NotificationsPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  await requireSession({ locale });
  const dict = await getDictionary(locale);

  return <NotificationsPage locale={locale} dict={dict} />;
}
