import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-sm font-medium uppercase tracking-wider text-amber-strong">
          404
        </p>
        <h1 className="font-display text-3xl font-medium text-text-1">
          Page not found
        </h1>
        <p className="text-sm text-text-2">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
