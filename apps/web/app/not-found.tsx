import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm font-medium uppercase tracking-wider">
          404
        </p>
        <h1 className="text-foreground text-3xl font-bold">Page not found</h1>
        <p className="text-muted-foreground text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
