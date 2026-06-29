'use client';

import {
  Building2Icon,
  UsersIcon,
  CreditCardIcon,
  TrendingUpIcon,
  LayoutGridIcon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetOrgQuery } from '@/store/api/endpoints/org.api';
import {
  useGetSubscriptionQuery,
  useCreatePortalSessionMutation,
} from '@/store/api/endpoints/billing.api';
import { useListUsersQuery } from '@/store/api/endpoints/users.api';
import { TimelineFeed } from '@/components/dashboard/timeline-feed';
import { PLAN_CATALOG_FALLBACK, getPlanByKey } from '@/lib/plans';
import type { MeResponse, MemberRole, SubscriptionStatus } from '@/types/api';
import type { PlanKey } from '@/app/[lang]/(public)/_sections/pricing-section';

/** Staff roles that count toward the plan usersLimit */
const STAFF_ROLES: MemberRole[] = ['supervisor', 'finance', 'maintenance'];

function subscriptionStatusBadge(status: SubscriptionStatus | undefined) {
  if (!status) return null;
  const variants: Record<
    SubscriptionStatus,
    { label: string; className: string }
  > = {
    ACTIVE: {
      label: 'Active',
      className: 'bg-emerald-500/15 text-emerald-600 border-emerald-200',
    },
    PAST_DUE: {
      label: 'Past due',
      className: 'bg-red-500/15 text-red-600 border-red-200',
    },
    CANCELED: {
      label: 'Canceled',
      className: 'bg-gray-500/15 text-gray-600 border-gray-200',
    },
    INCOMPLETE: {
      label: 'Incomplete',
      className: 'bg-yellow-500/15 text-yellow-700 border-yellow-200',
    },
    TRIALING: {
      label: 'Trial',
      className: 'bg-blue-500/15 text-blue-600 border-blue-200',
    },
    UNPAID: {
      label: 'Unpaid',
      className: 'bg-orange-500/15 text-orange-600 border-orange-200',
    },
    PAUSED: {
      label: 'Paused',
      className: 'bg-gray-400/15 text-gray-500 border-gray-200',
    },
  };
  const v = variants[status] ?? { label: status, className: '' };
  return (
    <Badge variant="outline" className={v.className}>
      {v.label}
    </Badge>
  );
}

interface OrgAdminDashboardProps {
  me: MeResponse | null;
  locale: string;
}

export function OrgAdminDashboard({ me, locale }: OrgAdminDashboardProps) {
  const { data: org, isLoading: orgLoading } = useGetOrgQuery();
  const { data: subscription, isLoading: subLoading } =
    useGetSubscriptionQuery();
  const { data: users, isLoading: usersLoading } = useListUsersQuery();
  const [createPortalSession, { isLoading: portalLoading }] =
    useCreatePortalSessionMutation();

  const isRtl = locale === 'ar';
  const userName = me?.user?.fullName ?? me?.user?.email ?? 'there';

  // ── Plan + usage derivation ──────────────────────────────────────────────────
  const planKey = subscription?.planKey as PlanKey | null | undefined;
  const planDef = planKey
    ? getPlanByKey(PLAN_CATALOG_FALLBACK, planKey)
    : undefined;

  /** Staff members (supervisor / finance / maintenance) — count toward usersLimit */
  const staffCount = users
    ? users.filter((m) => (STAFF_ROLES as string[]).includes(m.role)).length
    : 0;

  const usersLimit = planDef?.usersLimit ?? null;
  const buildingsLimit = planDef?.buildingsLimit ?? null;
  const planDisplayName = planDef
    ? isRtl
      ? planDef.nameAr
      : planDef.displayName
    : null;

  const unlimited = isRtl ? '∞' : '∞';

  async function handleManageBilling() {
    try {
      const result = await createPortalSession().unwrap();
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      // silently fail — billing portal errors are handled upstream
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {userName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s an overview of your organization.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Org name */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2Icon className="size-4 shrink-0" />
              <CardTitle className="text-xs font-medium uppercase tracking-wider">
                Organization
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {orgLoading ? (
              <Skeleton className="h-6 w-36" />
            ) : (
              <p className="text-xl font-semibold leading-tight">
                {org?.name ?? me?.org?.name ?? '—'}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CreditCardIcon className="size-4 shrink-0" />
              <CardTitle className="text-xs font-medium uppercase tracking-wider">
                Subscription
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {subLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {subscriptionStatusBadge(subscription?.status)}
                {!subscription && (
                  <span className="text-sm text-muted-foreground">
                    No active plan
                  </span>
                )}
              </div>
            )}
            {!subLoading && subscription?.status === 'ACTIVE' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="w-fit"
              >
                {portalLoading ? 'Opening…' : 'Manage billing'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <UsersIcon className="size-4 shrink-0" />
              <CardTitle className="text-xs font-medium uppercase tracking-wider">
                {isRtl ? 'أعضاء الفريق' : 'Team members'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <Skeleton className="h-6 w-12" />
            ) : (
              <p className="text-xl font-semibold leading-tight">
                {users?.length ?? 0}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Plan / Usage */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-muted-foreground">
              <LayoutGridIcon className="size-4 shrink-0" />
              <CardTitle className="text-xs font-medium uppercase tracking-wider">
                {isRtl ? 'الخطة والاستخدام' : 'Plan & usage'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {subLoading || usersLoading ? (
              <>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </>
            ) : (
              <>
                {/* Plan name */}
                <p className="text-xl font-semibold leading-tight capitalize">
                  {planDisplayName ?? (isRtl ? '—' : '—')}
                </p>

                {/* Buildings usage */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Building2Icon
                    className="size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{isRtl ? 'المباني:' : 'Buildings:'}</span>
                  <span className="font-medium text-foreground">
                    {/* Buildings count deferred to v2 — show "—" as the current value */}
                    {'— / '}
                    {buildingsLimit === null ? unlimited : buildingsLimit}
                  </span>
                </div>

                {/* Staff users usage */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <UsersIcon className="size-3.5 shrink-0" aria-hidden="true" />
                  <span>{isRtl ? 'الفريق:' : 'Staff:'}</span>
                  <span className="font-medium text-foreground">
                    {staffCount}
                    {' / '}
                    {usersLimit === null ? unlimited : usersLimit}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity feed */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Recent activity</h2>
        </div>
        <div className="rounded-xl border bg-card px-4 py-3">
          <TimelineFeed locale={locale} limit={8} />
        </div>
      </div>
    </div>
  );
}
