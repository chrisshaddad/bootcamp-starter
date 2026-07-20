'use client';

import { useUser, useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShieldX } from 'lucide-react';

export default function SuspendedPage() {
  const { user, isLoading } = useUser({ redirectOnUnauthenticated: false });
  const { logout } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      router.replace('/login');
    }
  };

  if (isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-orange/15 p-4">
            <ShieldX className="h-10 w-10 text-orange" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Account Suspended
          </h1>
          <p className="text-foreground">
            Your gym account has been suspended by an administrator.
          </p>
        </div>

        {user?.gymStatusReason && (
          <div className="rounded-lg border border-orange/30 bg-orange/10 p-4 text-left">
            <p className="text-sm font-medium text-orange mb-1">Reason</p>
            <p className="text-sm text-orange">{user.gymStatusReason}</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          If you believe this is a mistake, please contact support.
        </p>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? 'Logging out...' : 'Log out'}
        </Button>
      </div>
    </div>
  );
}
