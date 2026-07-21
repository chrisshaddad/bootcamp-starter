'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { SettingsTabs } from '@/components/settings-tabs';
import { useUser } from '@/hooks/use-auth';

export default function SettingsPage() {
  const { user, isLoading, error } = useUser();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-foreground text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your account security, notifications, and connected services.
        </p>
      </div>

      {error ? (
        <p className="text-destructive text-sm">
          Unable to load your settings. Please refresh the page.
        </p>
      ) : isLoading || !user ? (
        <div className="space-y-4">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <SettingsTabs user={user} />
      )}
    </div>
  );
}
