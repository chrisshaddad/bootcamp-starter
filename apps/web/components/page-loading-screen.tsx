import { TrendingUp } from 'lucide-react';

/**
 * Full-screen, centered loading state used by App Router's route-level
 * `loading.tsx` files - shown while a route segment is compiling/loading
 * during navigation, so switching pages doesn't read as a dead click.
 */
export function PageLoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-4 border-primary/15" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-primary border-r-violet" />
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-base to-primary-400">
          <TrendingUp className="h-4.5 w-4.5 text-white" />
        </div>
      </div>
      <p className="text-sm font-medium text-muted-foreground">Loading…</p>
    </div>
  );
}
