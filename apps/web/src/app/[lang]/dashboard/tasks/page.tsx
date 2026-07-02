import { requireSession } from '@/auth/guards';
import { normalizeRole } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import { redirect } from 'next/navigation';
import { isLocale } from '@/i18n/config';
import { Badge } from '@/components/ui/badge';
import { WrenchIcon } from 'lucide-react';

export default async function TasksPageRoute({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : 'en';
  const session = await requireSession({ locale });
  const role = normalizeRole(session.role ?? session.user?.role);

  // Tasks are for maintenance + org_admin only
  if (!canAccess(role, 'tasks')) {
    redirect(`/${locale}/dashboard`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Maintenance tasks and work orders for your assigned buildings.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-muted-foreground/25 bg-muted/20 flex flex-col items-center justify-center py-20 gap-4 text-center">
        <WrenchIcon className="size-12 text-muted-foreground/40" />
        <div>
          <h2 className="text-base font-semibold">
            Task management coming soon
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Maintenance requests, work orders, and task assignments will appear
            here in the next release once the task model is built.
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
