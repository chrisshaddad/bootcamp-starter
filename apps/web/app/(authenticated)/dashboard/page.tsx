'use client';

import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { useCurrentOrg } from '@/hooks/use-current-org';
import { useRentals } from '@/hooks/use-rentals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function OverdueWidget() {
  const { isStaff } = useCurrentOrg();
  const { total } = useRentals({ overdue: true, limit: 1, enabled: isStaff });

  if (!isStaff) return null;

  return (
    <Link href="/circulation/overdue" className="block">
      <Card className="border-border bg-card shadow-sm transition-colors hover:bg-library-primary-50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Overdue loans
          </CardTitle>
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">
            {total ?? '—'}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            past due and not returned
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome,{' '}
          {user?.profile?.firstName ||
            user?.name ||
            user?.email?.split('@')[0] ||
            'User'}
          !
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;re signed in to NextShelf.
        </p>
      </div>

      <OverdueWidget />

      {user && (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-foreground">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">
                  Role
                </dt>
                <dd className="mt-1 text-sm capitalize text-foreground">
                  {user.role.toLowerCase().replace('_', ' ')}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
