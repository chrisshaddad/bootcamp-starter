import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { MaintenanceRequestDetailPage } from '@/components/dashboard/maintenance-request-detail-page';

/**
 * The NextAuth session object does not expose the Keycloak `sub` (the JWT
 * strategy's session callback only surfaces name/email/image by default, and
 * this app's own session callback — auth/auth.ts — doesn't add it either).
 * `session.accessToken` is the raw Keycloak-issued JWT though, and its `sub`
 * claim is exactly the id `WorkOrder.assignedUserId` is compared against
 * (per repo convention: users are referenced by their Keycloak `sub`). Decode
 * it here rather than widening the shared session type for one call site.
 */
function decodeAccessTokenSub(token: string | undefined): string | undefined {
  if (!token) return undefined;
  try {
    const payload = token.split('.')[1];
    if (!payload) return undefined;
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as { sub?: string };
    return parsed.sub;
  } catch {
    return undefined;
  }
}

export default async function MaintenanceRequestDetailPageRoute({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'tasks')) {
    redirect(`/${locale}/dashboard`);
  }

  const dict = await getDictionary(locale);

  // Work Order create/reassign/delete is org_admin only; maintenance may
  // only update status/resolutionNotes on a Work Order assigned to them
  // (enforced in WorkOrdersService) — neither is the plain 'tasks'
  // canWrite() value, which is 'full' for maintenance at the page level.
  const callerSub = decodeAccessTokenSub(session.accessToken);

  return (
    <MaintenanceRequestDetailPage
      id={id}
      locale={locale}
      canWrite={role === 'org_admin'}
      isMaintenanceCaller={role === 'maintenance'}
      callerSub={callerSub}
      dict={dict}
    />
  );
}
