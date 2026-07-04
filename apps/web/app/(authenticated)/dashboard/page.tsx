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
        <h1 className="text-foreground text-2xl font-bold">
          Welcome,{' '}
          {user?.developerProfile?.displayName ||
            user?.hiringProfile?.organizationName ||
            user?.email?.split('@')[0] ||
            'User'}
          !
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          You&apos;re signed in. Start building your project.
        </p>
      </div>

      {user && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-lg font-semibold">
              Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground text-sm font-medium">
                  Email
                </dt>
                <dd className="text-foreground mt-1 text-sm">{user.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-sm font-medium">
                  Account Type
                </dt>
                <dd className="text-foreground mt-1 text-sm capitalize">
                  {user.accountType.toLowerCase().replace('_', ' ')}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
