'use client';

import Link from 'next/link';
import {
  Activity,
  BriefcaseBusiness,
  FolderGit2,
  Github,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AdminError,
  AdminPageHeader,
  StatusBadge,
} from '@/components/admin/admin-ui';
import { useAdminOverview } from '@/hooks/use-admin';

const ACTION_LABELS: Record<string, string> = {
  ACCOUNT_SUSPENDED: 'Account suspended',
  ACCOUNT_REACTIVATED: 'Account reactivated',
  PROJECT_ARCHIVED: 'Project archived',
  PROJECT_SUSPENDED: 'Project suspended',
  PROJECT_RESTORED: 'Project restored',
};

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">
          {label}
        </span>
        <span className="bg-primary-100 text-primary-base flex h-9 w-9 items-center justify-center rounded-lg">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <strong className="text-3xl font-extrabold tabular-nums">{value}</strong>
      <span className="text-muted-foreground text-xs">{detail}</span>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const { overview, isLoading, error } = useAdminOverview();

  if (isLoading) {
    return <Skeleton className="h-[620px] w-full rounded-xl" />;
  }
  if (error || !overview) {
    return <AdminError message="Unable to load platform insights." />;
  }

  const maxTechnologyCount = Math.max(
    1,
    ...overview.topTechnologies.map((technology) => technology.projectCount),
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Platform overview"
        description={`Operational snapshot updated ${new Date(overview.generatedAt).toLocaleString()}`}
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/logs">
              <Activity className="h-4 w-4" /> View audit logs
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Accounts"
          value={overview.accounts.total}
          detail={`${overview.accounts.createdLast30Days} joined in the last 30 days`}
          icon={Users}
        />
        <MetricCard
          label="Developer accounts"
          value={overview.accounts.developers}
          detail={`${overview.accounts.githubConnectedDevelopers} connected to GitHub`}
          icon={Github}
        />
        <MetricCard
          label="Hiring accounts"
          value={overview.accounts.hiring}
          detail={`${overview.accounts.unconfirmed} total accounts awaiting confirmation`}
          icon={BriefcaseBusiness}
        />
        <MetricCard
          label="Projects"
          value={overview.projects.total}
          detail={`${overview.projects.published} published · ${overview.projects.moderated} moderated`}
          icon={FolderGit2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform health</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            {[
              ['Active accounts', overview.accounts.active],
              ['Suspended accounts', overview.accounts.suspended],
              ['Draft projects', overview.projects.draft],
              ['Archived projects', overview.projects.archived],
              ['Suspended projects', overview.projects.suspended],
              ['Project members', overview.collaboration.members],
              [
                'Pending invitations',
                overview.collaboration.pendingInvitations,
              ],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-muted/40 rounded-lg p-4">
                <div className="text-muted-foreground text-xs">{label}</div>
                <div className="mt-1 text-xl font-bold tabular-nums">
                  {value}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top technologies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.topTechnologies.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No technology data yet.
              </p>
            ) : (
              overview.topTechnologies.map((technology) => (
                <div key={technology.slug}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">{technology.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {technology.projectCount}
                    </span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-primary-base h-full rounded-full"
                      style={{
                        width: `${Math.max(6, (technology.projectCount / maxTechnologyCount) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> Recent moderation activity
            </CardTitle>
            <Button asChild size="sm" variant="ghost" className="shrink-0">
              <Link href="/admin/logs">View all</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {overview.recentAuditLogs.length === 0 ? (
            <p className="text-muted-foreground py-5 text-center text-sm">
              No administrative actions recorded yet.
            </p>
          ) : (
            overview.recentAuditLogs.map((log) => (
              <div
                key={log.id}
                className="border-border flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {ACTION_LABELS[log.action]}
                    </span>
                    <StatusBadge tone="info">{log.targetType}</StatusBadge>
                  </div>
                  <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
                    {log.reason ?? 'No reason supplied'}
                  </p>
                </div>
                <div className="text-muted-foreground text-right text-xs">
                  <div>{log.actor?.displayName ?? 'Deleted administrator'}</div>
                  <div>{new Date(log.createdAt).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
