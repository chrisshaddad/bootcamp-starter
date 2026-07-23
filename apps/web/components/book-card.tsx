import Link from 'next/link';
import { BookCover } from '@/components/book-cover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getBuyPriceRange, formatPriceRange } from '@/lib/book-condition';
import type { BookResponse } from '@repo/contracts';

interface BookCardProps {
  book: BookResponse;
}

export function BookCard({ book }: BookCardProps) {
  const isAvailable = book.availableCopies > 0;

  return (
    <Link
      href={`/browse/${book.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
    >
      <BookCover
        coverUrl={book.coverUrl}
        title={book.title}
        className="aspect-2/3 w-full"
      />

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="line-clamp-2 font-semibold text-foreground group-hover:text-library-primary">
            {book.title}
          </h3>
          {book.authors.length > 0 && (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {book.authors.map((author) => author.name).join(', ')}
            </p>
          )}
        </div>

        {book.categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {book.categories.slice(0, 2).map((category) => (
              <Badge key={category.id} variant="outline" className="text-xs">
                {category.name}
              </Badge>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-foreground">
            {formatPriceRange(getBuyPriceRange(book.conditionPrices))}
          </span>
          <Badge
            className={cn(
              'text-xs',
              isAvailable
                ? 'bg-success-light text-success-dark'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {isAvailable ? `${book.availableCopies} available` : 'Unavailable'}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
