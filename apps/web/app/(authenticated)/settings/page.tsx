'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileForm } from '@/components/profile-form';
import { UserCog } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';

export default function SettingsPage() {
  const { user, isLoading, error } = useUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and organization settings
        </p>
      </div>

      <Card className="border-gray-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <UserCog className="h-5 w-5 text-gray-500" />
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
