import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { Badge } from '@/components/ui/badge';
import { BarChart3Icon } from 'lucide-react';

export default async function ReportsPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  // Only org_admin and finance may access reports
  if (!canAccess(role, 'reports')) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Financial and operational reports for your organization.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 flex flex-col items-center justify-center py-20 gap-4 text-center">
        <BarChart3Icon className="size-12 text-muted-foreground/40" />
        <div>
          <h2 className="text-base font-semibold">Reports coming soon</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Revenue summaries, occupancy reports, and maintenance KPIs are being
            built and will appear here in the next release.
          </p>
        </div>
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200"
        >
          Coming soon
        </Badge>
      </div>
    </div>
  );
}
