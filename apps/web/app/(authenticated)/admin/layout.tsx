'use client';

import { useUser } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldX, AlertTriangle } from 'lucide-react';

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        You do not have permission to access the super admin area.
      </p>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertTriangle className="mb-4 h-16 w-16 text-error" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">
        Something went wrong
      </h1>
      <p className="max-w-md text-center text-gray-500">
        We couldn&apos;t verify your access right now. Please try again.
      </p>
      {onRetry ? (
        <Button type="button" onClick={onRetry} className="mt-4">
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, error, mutate } = useUser({
    redirectOnUnauthenticated: true,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // 401s are handled by useUser itself (redirects to /login). Anything else
  // (500s, network errors) means we couldn't verify the user's role at all —
  // show an error state instead of falsely telling them they're forbidden.
  if (error?.status === 401) {
    return null;
  }

  if (error && error.status !== 401) {
    return <ErrorState onRetry={() => void mutate()} />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <ForbiddenPage />;
  }

  // Full height so pages that fill the viewport (e.g. the audit console, which
  // scrolls its table internally) have a definite height to stretch into. Pages
  // that render normal flow content are unaffected — they stay top-aligned.
  return <div className="h-full">{children}</div>;
}
