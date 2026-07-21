'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileForm } from '@/components/profile-form';
import { UserCog } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading, error } = useUser();

  useEffect(() => {
    if (user?.accountType === 'SUPER_ADMIN') {
      router.replace('/admin');
    }
  }, [router, user?.accountType]);

  if (isLoading || user?.accountType === 'SUPER_ADMIN') {
    return <Skeleton className="h-[520px] w-full rounded-xl" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-foreground text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your public profile information
          </p>
        </div>
        {user?.developerProfile?.publicSlug && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/developers/${user.developerProfile.publicSlug}`}>
              View public profile
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
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
          ) : !user ? (
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
