'use client';

import { useUser } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldX } from 'lucide-react';

function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <ShieldX className="mb-4 h-16 w-16 text-red-400" />
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Access Denied</h1>
      <p className="max-w-md text-center text-gray-500">
        You do not have permission to access the super admin area.
      </p>
    </div>
  );
}

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUser({ redirectOnUnauthenticated: true });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <ForbiddenPage />;
  }

  return <div className="space-y-6">{children}</div>;
}
