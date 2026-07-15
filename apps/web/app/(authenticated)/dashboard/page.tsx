'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Briefcase,
  Calendar,
  FileText,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { useOpportunities } from '@/hooks/use-opportunities';
import { useApplications } from '@/hooks/use-applications';
import { useCareerPaths } from '@/hooks/use-career-paths';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ApplicationStatus } from '@repo/contracts';

const STATUS_BADGE_COLORS: Record<ApplicationStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
};

function toLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface StatCardProps {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  href: string;
  loading: boolean;
}

function StatCard({ title, value, icon, href, loading }: StatCardProps) {
  const router = useRouter();
  return (
    <Card
      className="flex items-center gap-4 p-5 border-gray-200 shadow-sm cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => router.push(href)}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-base/10 text-primary-base">
        {icon}
      </div>
      <div>
        {loading ? (
          <Skeleton className="h-7 w-12" />
        ) : (
          <p className="text-2xl font-bold text-gray-900">{value ?? 0}</p>
        )}
        <p className="text-xs text-gray-500">{title}</p>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: userLoading } = useUser();

  const { opportunities, isLoading: oppsLoading } = useOpportunities({
    status: 'OPEN',
  });
  const { applications, isLoading: appsLoading } = useApplications();
  const { careerPaths, isLoading: pathsLoading } = useCareerPaths();

  if (userLoading) {
    return <DashboardSkeleton />;
  }

  const recentApplications = (applications ?? []).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back,{' '}
          {user?.name || user?.email?.split('@')[0] || 'there'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s an overview of your career activity
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Open Opportunities"
          value={opportunities?.length}
          icon={<Briefcase className="h-5 w-5" />}
          href="/opportunities"
          loading={oppsLoading}
        />
        <StatCard
          title="My Applications"
          value={applications?.length}
          icon={<FileText className="h-5 w-5" />}
          href="/applications"
          loading={appsLoading}
        />
        <StatCard
          title="Career Paths"
          value={careerPaths?.length}
          icon={<TrendingUp className="h-5 w-5" />}
          href="/career-paths"
          loading={pathsLoading}
        />
        <StatCard
          title="Pending Applications"
          value={
            applications?.filter((a) => a.status === 'PENDING').length
          }
          icon={<Layers className="h-5 w-5" />}
          href="/applications"
          loading={appsLoading}
        />
      </div>

      {/* Recent Applications */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            Recent Applications
          </h2>
          {(applications?.length ?? 0) > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/applications')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              View all
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {appsLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : recentApplications.length === 0 ? (
          <Card className="flex flex-col items-center justify-center border-dashed border-gray-200 py-12 text-center">
            <FileText className="h-8 w-8 text-gray-300" />
            <p className="mt-2 text-sm text-gray-500">
              No applications yet
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => router.push('/opportunities')}
            >
              Browse Opportunities
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {recentApplications.map((app) => (
              <Card
                key={app.id}
                className="flex items-center justify-between gap-4 p-4 border-gray-200 shadow-sm cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/applications/${app.id}`)}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {app.opportunity.title}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                      {toLabel(app.opportunity.type)}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        STATUS_BADGE_COLORS[app.status],
                      )}
                    >
                      {toLabel(app.status)}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar className="h-3 w-3" />
                    Applied {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-300" />
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
