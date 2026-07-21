'use client';

import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { SettingsTabs } from '@/components/settings-tabs';
import { BackLink } from '@/components/back-link';
import { useUser } from '@/hooks/use-auth';

function SettingsContent() {
  const { user, isLoading, error } = useUser();

  if (error) {
    return (
      <p className="text-destructive text-sm">
        Unable to load your settings. Please refresh the page.
      </p>
    );
  }

  if (isLoading || !user) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <SettingsTabs user={user} />;
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <BackLink fallbackHref="/dashboard" fallbackLabel="Dashboard" />

      <div>
        <h1 className="text-foreground text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your account security, notifications, and connected services.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-9 w-full max-w-md" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <SettingsContent />
      </Suspense>
    </div>
  );
}
