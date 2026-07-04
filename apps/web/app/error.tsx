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
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="bg-destructive/10 flex h-12 w-12 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive h-6 w-6" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-foreground text-2xl font-bold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground max-w-md text-sm">
          An unexpected error occurred. Try again, or head back home if the
          problem persists.
        </p>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">
            id: {error.digest}
          </p>
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
