'use client';

import { useEffect, type ElementType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  CheckCircle2,
  Layers,
  Github,
  ArrowRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/use-auth';
import { useProjects } from '@/hooks/use-projects';
import { ApiError } from '@/lib/api';
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
} from '@/lib/project-status';

const THUMB_GRADIENTS = [
  'from-primary-base to-accent',
  'from-purple to-accent',
  'from-orange to-accent',
];

interface SetupStep {
  label: string;
  hint: string;
  done: boolean;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-9 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconClassName,
}: {
  icon: ElementType;
  label: string;
  value: number;
  sub: string;
  iconClassName: string;
}) {
  return (
    <Card className="gap-2 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconClassName}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="text-foreground text-3xl font-extrabold tracking-tight tabular-nums">
        {value}
      </div>
      <p className="text-muted-foreground text-xs">{sub}</p>
    </Card>
  );
}

function SetupChecklist({ steps }: { steps: SetupStep[] }) {
  const done = steps.filter((s) => s.done).length;
  const percent = Math.round((done / steps.length) * 100);

  return (
    <Card className="flex flex-col gap-5 p-5 shadow-sm sm:flex-row sm:items-center">
      <div
        className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold"
        style={{
          background: `conic-gradient(var(--color-primary-base) 0 ${percent}%, var(--color-gray-300) 0)`,
        }}
      >
        <span className="bg-card flex h-[calc(100%-8px)] w-[calc(100%-8px)] items-center justify-center rounded-full">
          {percent}%
        </span>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <div key={step.label} className="flex items-start gap-2">
            <span
              className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full ${
                step.done
                  ? 'bg-success text-white'
                  : 'border-gray-400 border-[1.5px]'
              }`}
            >
              {step.done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>
            <div>
              <p
                className={`text-xs font-semibold ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {step.label}
              </p>
              {!step.done && (
                <p className="text-muted-foreground/70 text-[11px]">
                  {step.hint}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: isUserLoading, error: userError } = useUser();
  const {
    projects,
    isLoading: isProjectsLoading,
    error: projectsError,
  } = useProjects();
  const error = userError ?? projectsError;

  useEffect(() => {
    if (user?.accountType === 'SUPER_ADMIN') {
      router.replace('/admin');
    }
  }, [router, user?.accountType]);

  if (
    isUserLoading ||
    isProjectsLoading ||
    user?.accountType === 'SUPER_ADMIN'
  ) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-2 border-dashed py-16 text-center">
        <p className="font-medium">Unable to load your dashboard</p>
        <p className="text-muted-foreground max-w-xs text-sm">
          {error instanceof ApiError ? error.message : 'Something went wrong.'}
        </p>
      </Card>
    );
  }

  const displayName =
    user?.developerProfile?.displayName ||
    user?.hiringProfile?.organizationName ||
    user?.email?.split('@')[0] ||
    'there';

  const isGithubConnected = !!user?.developerProfile?.githubUsername;
  const publishedCount = projects.filter(
    (p) => p.status === 'PUBLISHED',
  ).length;
  const draftCount = projects.filter((p) => p.status === 'DRAFT').length;
  const technologyCount = new Set(
    projects.flatMap((p) => p.technologies.map((t) => t.technologyId)),
  ).size;

  const setupSteps: SetupStep[] = [
    {
      label: 'Connect GitHub',
      hint: 'Import repos automatically',
      done: isGithubConnected,
    },
    {
      label: 'Publish a project',
      hint: 'Make it visible to recruiters',
      done: publishedCount > 0,
    },
    {
      label: 'Add a profile photo',
      hint: 'Recruiters trust faces',
      done: !!user?.developerProfile?.profilePictureUrl,
    },
    {
      label: 'Write your bio',
      hint: 'Two sentences is enough',
      done: !!user?.developerProfile?.bio,
    },
  ];
  const setupComplete = setupSteps.every((s) => s.done);

  const recentProjects = projects.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-foreground text-2xl font-bold">
            Welcome back, {displayName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-sm">
              {projects.length === 0
                ? "You haven't added any projects yet"
                : `${publishedCount} of ${projects.length} project${projects.length === 1 ? '' : 's'} published`}
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isGithubConnected
                  ? 'bg-success/10 text-success-dark'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Github className="h-3 w-3" />
              {isGithubConnected ? 'GitHub connected' : 'GitHub not connected'}
            </span>
          </div>
        </div>

        <Button asChild>
          <Link href="/projects/new">
            <Github className="h-4 w-4" />
            Import from GitHub
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={FolderKanban}
          label="Total projects"
          value={projects.length}
          sub={
            projects.length === 0
              ? 'No projects yet'
              : draftCount > 0
                ? `${draftCount} in draft`
                : 'All published'
          }
          iconClassName="bg-primary-100 text-primary-base"
        />
        <StatCard
          icon={CheckCircle2}
          label="Published"
          value={publishedCount}
          sub="Visible to recruiters"
          iconClassName="bg-success/10 text-success-dark"
        />
        <StatCard
          icon={Layers}
          label="Technologies"
          value={technologyCount}
          sub="Auto-detected from repos"
          iconClassName="bg-warning/15 text-warning-dark"
        />
      </div>

      {/* Setup checklist */}
      {!setupComplete && <SetupChecklist steps={setupSteps} />}

      {/* Projects */}
      {projects.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-dashed py-16 text-center">
          <span className="bg-accent text-primary-base flex h-12 w-12 items-center justify-center rounded-full">
            <Sparkles className="h-6 w-6" />
          </span>
          <p className="font-semibold">Ready to showcase your first project?</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            Import a repository from GitHub to start building your public
            portfolio.
          </p>
          <Button asChild className="mt-2">
            <Link href="/projects/new">
              <Github className="h-4 w-4" />
              Import from GitHub
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-foreground text-base font-bold">
              Your projects
            </h2>
            <Link
              href="/projects"
              className="text-primary-base inline-flex items-center gap-1 text-sm font-semibold hover:underline"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentProjects.map((project, index) => {
              const cover = project.media[0];
              const techs = project.technologies.slice(0, 3);
              const extraTechCount = project.technologies.length - techs.length;

              return (
                <Card
                  key={project.id}
                  className="group relative flex flex-col overflow-hidden py-0 shadow-sm transition-colors hover:border-primary/50"
                >
                  <Link
                    href={`/projects/${project.id}/preview`}
                    className="flex flex-1 flex-col"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cover.publicUrl}
                          alt={cover.caption ?? project.title}
                          className="h-full w-full object-cover transition-[filter] duration-200 group-hover:brightness-95"
                        />
                      ) : (
                        <div
                          className={`h-full bg-gradient-to-br transition-[filter] duration-200 group-hover:brightness-110 ${THUMB_GRADIENTS[index % THUMB_GRADIENTS.length]}`}
                        />
                      )}
                      <span
                        className={`absolute top-2.5 right-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${PROJECT_STATUS_COLORS[project.status]}`}
                      >
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                    </div>

                    <div className="flex flex-1 gap-3 px-4 pt-3">
                      {project.logoUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={project.logoUrl}
                          alt={`${project.title} logo`}
                          className="h-10 w-10 flex-shrink-0 rounded-lg border object-cover"
                        />
                      )}
                      <div className="flex flex-1 flex-col gap-1.5">
                        <p className="text-sm font-semibold group-hover:text-primary-base">
                          {project.title}
                        </p>
                        {project.shortDescription && (
                          <p className="text-muted-foreground line-clamp-2 text-xs">
                            {project.shortDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="flex flex-wrap gap-1.5 px-4 pt-2 pb-3.5">
                    {techs.map((t) => (
                      <span
                        key={t.id}
                        className="bg-muted text-foreground rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                      >
                        {t.technology.name}
                      </span>
                    ))}
                    {extraTechCount > 0 && (
                      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[10.5px] font-semibold">
                        +{extraTechCount}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}

            {recentProjects.length < 3 && (
              <Link
                href="/projects/new"
                className="border-gray-400 text-muted-foreground hover:border-primary-base hover:text-primary-base flex flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed p-6 text-center transition-colors"
              >
                <span className="bg-accent text-primary-base flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold">
                  +
                </span>
                <span className="text-foreground text-xs font-semibold">
                  Import your next repo
                </span>
                <span className="text-[11px]">
                  Pull tech stack &amp; contributors automatically
                </span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
