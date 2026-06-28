import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { Badge } from '@/components/ui/badge';
import { Building2Icon } from 'lucide-react';

/**
 * Building detail page — thin placeholder.
 * Full building detail view is deferred to the next iteration (needs units/floors).
 * The page is access-gated; admin/finance/supervisor/maintenance may enter.
 */
export default async function BuildingDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  if (!canAccess(role, 'buildings')) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Building2Icon className="size-6 text-muted-foreground" />
          Building detail
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Detailed building view (units, floors, leases) is coming in stage 2.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 flex flex-col items-center justify-center py-16 gap-4 text-center">
        <Building2Icon className="size-10 text-muted-foreground/40" />
        <div>
          <p className="text-sm font-medium">
            Building ID: <span className="font-mono">{id}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Full detail view — coming soon
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
