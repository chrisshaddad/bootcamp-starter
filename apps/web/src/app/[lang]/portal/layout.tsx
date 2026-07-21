import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { requireSession } from '@/auth/guards';
import { dashboardPathForRole, normalizeRole } from '@/auth/roles';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { PortalShell } from '@/components/portal/portal-shell';

/**
 * Tenant portal shell (TP2). A visually distinct, light/warm, mobile-first
 * resident experience — NOT the admin dashboard chrome. Only the `tenant`
 * role belongs here; every other role is bounced back to their dashboard.
 * Routing-isolation (roles/permissions/middleware) is owned by the
 * orchestrator, so this guard is intentionally self-contained here.
 */
export default async function PortalLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });

  const role = normalizeRole(session.role ?? session.user?.role);
  if (role !== 'tenant') {
    redirect(dashboardPathForRole(role ?? 'org_admin', locale));
  }

  const dict = await getDictionary(locale);
  const userName = session.user?.name ?? session.user?.email ?? '';

  return (
    <PortalShell locale={locale} dict={dict} userName={userName}>
      {children}
    </PortalShell>
  );
}
