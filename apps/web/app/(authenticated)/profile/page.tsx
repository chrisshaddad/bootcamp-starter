'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileForm } from '@/components/profile-form';
import { UserCog } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';

export default function ProfilePage() {
  const { user, isLoading, error } = useUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your public profile information
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2 text-lg font-semibold">
            <UserCog className="text-muted-foreground h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-sm text-destructive">
              Unable to load your profile. Please refresh the page.
            </p>
          ) : isLoading || !user ? (
            <div className="space-y-5">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : (
            <ProfileForm user={user} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
