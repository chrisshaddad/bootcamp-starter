import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
          404
        </p>
        <h1 className="text-3xl font-bold text-gray-900">Page not found</h1>
        <p className="text-sm text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}
