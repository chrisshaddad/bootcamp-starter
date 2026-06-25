'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserX } from 'lucide-react';

export default function DeactivatedPage() {
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-gray-100 p-4">
            <UserX className="h-10 w-10 text-gray-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            Account Deactivated
          </h1>
          <p className="text-gray-700">
            Your membership has been deactivated by the gym. You no longer have
            access to the member portal.
          </p>
        </div>

        <p className="text-sm text-gray-600">
          If you believe this is a mistake, please contact your gym directly.
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
