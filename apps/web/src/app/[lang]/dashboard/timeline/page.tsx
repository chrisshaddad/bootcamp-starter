import { redirect } from 'next/navigation';

import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { isLocale } from '@/i18n/config';
import { TimelineFeed } from '@/components/dashboard/timeline-feed';

export default async function TimelinePageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  // Role gate (defence-in-depth). A role-less / unpaid user has no timeline
  // access; this also restores the block previously provided by the middleware
  // paywall (now removed in favour of the org-status gate on the dashboard RSC).
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);
  if (!canAccess(role, 'timeline')) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Activity</h1>
      <TimelineFeed locale={locale} limit={20} />
    </div>
  );
}
