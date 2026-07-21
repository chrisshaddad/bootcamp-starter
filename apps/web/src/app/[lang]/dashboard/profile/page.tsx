import { UserIcon, ExternalLinkIcon } from 'lucide-react';

import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { serverEnv } from '@/lib/env';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const dict = await getDictionary(locale);
  const t = dict.profile;

  // Any authenticated role may view their own profile — no role gate here.
  // proxy.ts intentionally excludes /dashboard/profile from its permission
  // matrix, so this requireSession() call is the sole guard for this page.
  const session = await requireSession({ locale });

  let me: MeResponse | null = null;
  if (session.accessToken) {
    me = await fetchMe(session.accessToken);
  }

  const name = me?.user?.fullName ?? session.user?.name ?? '—';
  const email = me?.user?.email ?? session.user?.email ?? '—';
  const role = normalizeRole(me?.role ?? session.role ?? session.user?.role);
  const roleLabel = role ? dict.auth.roles[role] : '—';
  const orgName = me?.org?.name ?? '—';
  const orgStatus = me?.org?.status;
  const orgStatusLabel = orgStatus ? dict.billing.status[orgStatus] : null;

  const accountUrl = `${serverEnv.KEYCLOAK_BASE}/realms/${serverEnv.KEYCLOAK_REALM}/account`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <UserIcon className="size-6 text-muted-foreground" />
          {t.title}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 rounded-xl border bg-card p-6 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.name}</p>
          <p className="text-sm">{name}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.email}</p>
          <p className="text-sm">{email}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.role}</p>
          <p className="text-sm">{roleLabel}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">{t.organization}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm">{orgName}</p>
            {orgStatusLabel && (
              <Badge variant="outline" className="text-xs">
                {orgStatusLabel}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-md">
          <h2 className="text-sm font-medium text-foreground">
            {t.manageAccount}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t.manageAccountHint}
          </p>
        </div>
        <Button
          variant="outline"
          render={<a href={accountUrl} target="_blank" rel="noreferrer" />}
        >
          {t.manageAccount}
          <ExternalLinkIcon />
        </Button>
      </div>
    </div>
  );
}
