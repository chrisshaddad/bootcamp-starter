'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface unexpected errors in the browser console; replace with your
    // observability sink (Sentry, etc.) when you wire one up.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900">
          Something went wrong
        </h1>
        <p className="max-w-md text-sm text-gray-500">
          An unexpected error occurred. Try again, or head back home if the
          problem persists.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-gray-400">id: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Button onClick={() => (window.location.href = '/')}>Go home</Button>
      </div>
    </div>
  );
}
