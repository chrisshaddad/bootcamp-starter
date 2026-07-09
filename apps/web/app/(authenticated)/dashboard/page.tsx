'use client';

import { useUser } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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
        <h1 className="font-display text-[26px] font-medium text-text-1">
          Welcome,{' '}
          {user?.profile?.firstName ||
            user?.name ||
            user?.email?.split('@')[0] ||
            'User'}
        </h1>
        <p className="mt-0.5 text-[13px] text-text-2">
          You&apos;re signed in. Start building your project.
        </p>
      </div>

      {user && (
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="font-display text-lg font-medium text-text-1">
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-text-3">
                  Email
                </dt>
                <dd className="mt-1 font-mono text-[13px] text-text-1">
                  {user.email}
                </dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-[0.05em] text-text-3">
                  Role
                </dt>
                <dd className="mt-1 text-[13px] capitalize text-text-1">
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
