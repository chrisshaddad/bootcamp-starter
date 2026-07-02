import { requireSession, requireActiveOrg } from '@/auth/guards';
import { getDictionary } from '@/i18n/get-dictionary';
import { isLocale } from '@/i18n/config';
import { serverEnv } from '@/lib/env';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { DashboardTopbar } from '@/components/layout/dashboard-topbar';
import type { ReactNode } from 'react';
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

export default async function DashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });

  // Authoritative paywall for the WHOLE dashboard subtree (incl. every
  // sub-page). "Has paid?" is org.status === ACTIVE in the DB — token-
  // independent, so it correctly bounces a lapsed (PAST_DUE/CANCELED) or
  // not-yet-paid (PENDING) org even when their session still carries a role.
  // Per-page requireRole/canAccess remains the finer-grained gate on top.
  if (session.accessToken) {
    const me = await fetchMe(session.accessToken);
    if (me?.org?.status) {
      await requireActiveOrg(me.org.status, locale);
    }
  }

  const dict = await getDictionary(locale);
  const role = session.role ?? session.user?.role ?? null;
  const userName = session.user?.name ?? session.user?.email ?? '';

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar
        locale={locale}
        role={role}
        dict={dict}
        userName={userName}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardTopbar
          locale={locale}
          userName={userName}
          role={role}
          dict={dict}
        />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
