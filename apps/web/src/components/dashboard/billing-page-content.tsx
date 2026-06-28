'use client';

import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGetSubscriptionQuery } from '@/store/api/endpoints/billing.api';
import { useCreatePortalSessionMutation } from '@/store/api/endpoints/billing.api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SubscriptionResponse } from '@/types/api';

interface BillingPageContentProps {
  locale: string;
  dict: Record<string, unknown>;
}

function getStatusBadge(status: SubscriptionResponse['status']) {
  switch (status) {
    case 'ACTIVE':
      return (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-800 border-green-200"
        >
          Active
        </Badge>
      );
    case 'PAST_DUE':
    case 'UNPAID':
      return (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 border-red-200"
        >
          {status === 'PAST_DUE' ? 'Past Due' : 'Unpaid'}
        </Badge>
      );
    case 'CANCELED':
      return <Badge variant="secondary">Canceled</Badge>;
    default:
      return (
        <Badge variant="outline" className="capitalize">
          {status.replace(/_/g, ' ').toLowerCase()}
        </Badge>
      );
  }
}

export function BillingPageContent({ locale }: BillingPageContentProps) {
  const router = useRouter();
  const { data: sub, isLoading } = useGetSubscriptionQuery();
  const [createPortal, { isLoading: portalLoading }] =
    useCreatePortalSessionMutation();

  async function handleManage() {
    const r = await createPortal();
    if ('data' in r && r.data?.url) {
      window.location.href = r.data.url;
    }
  }

  const isActive = sub?.status === 'ACTIVE';

  return (
    <div className="flex flex-col gap-6">
      {/* Page heading */}
      <h1 className="text-3xl font-bold tracking-tight">Billing</h1>

      {/* Subscription status card */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            Manage your plan and billing details.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-36" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  Status
                </span>
                {sub?.status ? (
                  getStatusBadge(sub.status)
                ) : (
                  <Badge variant="outline">—</Badge>
                )}
              </div>

              {sub?.currentPeriodEnd && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Current period ends
                  </span>
                  <span className="text-sm font-medium">
                    {format(new Date(sub.currentPeriodEnd), 'MMMM d, yyyy', {
                      locale: locale === 'ar' ? ar : undefined,
                    })}
                  </span>
                </div>
              )}

              <div>
                <Button
                  variant="outline"
                  onClick={handleManage}
                  disabled={portalLoading}
                >
                  {portalLoading ? 'Redirecting…' : 'Manage billing'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Status callout banner */}
      {!isLoading && (
        <div
          className={
            isActive
              ? 'rounded-lg border border-teal-200 bg-teal-50 p-4 text-teal-800'
              : 'rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800'
          }
        >
          {isActive ? (
            <p className="text-sm font-medium">
              Your workspace is active and fully operational.
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium">
                Your subscription is not active. Activate to access all
                features.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push(`/${locale}/billing`)}
              >
                Subscribe now
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Stripe security note */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>Payments secured by Stripe</span>
      </div>
    </div>
  );
}
