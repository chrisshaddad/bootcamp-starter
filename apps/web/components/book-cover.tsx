import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookCoverProps {
  coverUrl: string | null;
  title: string;
  className?: string;
}

/**
 * A book cover image with a graceful placeholder when `coverUrl` is null.
 * Plain `<img>`, not next/image - coverUrl is arbitrary staff-supplied data,
 * not a fixed set of known remote hosts next/image's config can allow-list.
 */
export function BookCover({ coverUrl, title, className }: BookCoverProps) {
  if (!coverUrl) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-library-primary-100',
          className,
        )}
      >
        <BookOpen className="h-1/3 w-1/3 text-library-primary-600" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coverUrl}
      alt={title}
      className={cn('bg-muted object-cover', className)}
    />
  );
}
