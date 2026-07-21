import { UserIcon, ExternalLinkIcon, KeyRoundIcon } from 'lucide-react';

import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { serverEnv } from '@/lib/env';
import { getPortalDict } from '@/components/portal/portal-dict';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

export default async function PortalProfilePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const dict = await getDictionary(locale);
  // Shared profile labels (same as the admin profile page); the extra
  // change-password link copy lives in the portal namespace.
  const t = dict.profile;
  const tp = getPortalDict(dict, locale).profile;

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

  const accountUrl = `${serverEnv.KEYCLOAK_BASE}/realms/${serverEnv.KEYCLOAK_REALM}/account`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
          <UserIcon className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t.title}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      <Card className="ring-foreground/10">
        <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label={t.name}>{name}</Field>
          <Field label={t.email}>{email}</Field>
          <Field label={t.role}>
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-400/10 dark:text-amber-300"
            >
              {roleLabel}
            </Badge>
          </Field>
          <Field label={t.organization}>{orgName}</Field>
        </CardContent>
      </Card>

      {/* Account management (Keycloak console) */}
      <Card className="ring-foreground/10">
        <CardContent className="flex flex-col gap-4">
          <ActionRow
            icon={<UserIcon className="size-5" />}
            title={t.manageAccount}
            hint={t.manageAccountHint}
            href={accountUrl}
            cta={t.manageAccount}
          />
          <div className="border-t border-border/60" />
          <ActionRow
            icon={<KeyRoundIcon className="size-5" />}
            title={tp.changePassword}
            hint={tp.changePasswordHint}
            href={accountUrl}
            cta={tp.changePassword}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

function ActionRow({
  icon,
  title,
  hint,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-300">
          {icon}
        </span>
        <div className="max-w-md">
          <h2 className="text-sm font-medium text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <Button
        variant="outline"
        render={<a href={href} target="_blank" rel="noreferrer" />}
      >
        {cta}
        <ExternalLinkIcon />
      </Button>
    </div>
  );
}
