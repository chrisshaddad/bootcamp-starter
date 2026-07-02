import { requireSession, requireActiveOrg } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { isLocale } from '@/i18n/config';
import { serverEnv } from '@/lib/env';
import { SessionRefresher } from '@/components/auth/session-refresher';
import { OrgAdminDashboard } from '@/components/dashboard/org-admin-dashboard';
import { FinanceDashboard } from '@/components/dashboard/finance-dashboard';
import { StaffDashboard } from '@/components/dashboard/staff-dashboard';
import { TenantDashboard } from '@/components/dashboard/tenant-dashboard';
import { DefaultDashboard } from '@/components/dashboard/default-dashboard';
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

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';

  const session = await requireSession({ locale });
  const token = session.accessToken;

  let me: MeResponse | null = null;
  if (token) {
    me = await fetchMe(token);
  }

  // If org status is not ACTIVE, redirect to billing gate.
  if (me?.org?.status) {
    await requireActiveOrg(me.org.status, locale);
  }

  // Determine if we need to force a session token refresh.
  const sessionOrgId = session.orgId;
  const sessionRole = session.role ?? session.user?.role;
  const meOrgId = me?.orgId;
  const shouldRefresh = Boolean(
    // org_id provisioned since token was minted — fold it in
    (meOrgId && !sessionOrgId) ||
    // Org is ACTIVE (payment completed) but role not yet in session token.
    // Safety net for the case where the orchestrator's updateSession did not
    // propagate the org_admin role before navigating here.
    (me?.org?.status === 'ACTIVE' && !sessionRole),
  );

  // Determine role — prefer /me response, fall back to session token
  const role =
    normalizeRole(me?.role) ??
    normalizeRole(session.role ?? session.user?.role);

  function renderDashboard() {
    if (role === 'org_admin') {
      return <OrgAdminDashboard me={me} locale={locale} />;
    }
    if (role === 'finance') {
      return <FinanceDashboard me={me} locale={locale} />;
    }
    if (role === 'supervisor' || role === 'maintenance') {
      return <StaffDashboard me={me} locale={locale} role={role} />;
    }
    if (role === 'tenant') {
      return <TenantDashboard me={me} locale={locale} />;
    }
    return (
      <DefaultDashboard me={me} locale={locale} role={role ?? 'unknown'} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SessionRefresher shouldRefresh={shouldRefresh} />
      {renderDashboard()}
    </div>
  );
}
