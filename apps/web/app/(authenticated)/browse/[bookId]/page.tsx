'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { usePortalBook } from '@/hooks/use-portal-books';
import { usePortalBookCopies } from '@/hooks/use-portal-book-copies';
import { usePortalReservations } from '@/hooks/use-portal-reservations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BookOpen, User, Tag, Building } from 'lucide-react';
import { ApiError } from '@/lib/api';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const [isPlacingHold, setIsPlacingHold] = useState(false);

  const { book, isLoading, error } = usePortalBook(bookId);
  const { bookCopies } = usePortalBookCopies(bookId);
  const { placeHold } = usePortalReservations({ enabled: false });

  const availableCopies =
    bookCopies?.filter((copy) => copy.status === 'AVAILABLE').length ?? 0;

  const handlePlaceHold = async () => {
    setIsPlacingHold(true);
    try {
      await placeHold({ bookId });
      toast.success('Hold placed! Check My Reservations for updates.');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to place hold');
      }
    } finally {
      setIsPlacingHold(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error || !book) {
    return (
      <div className="py-10 text-center">
        <div className="text-error mb-4">Book not found</div>
        <Button variant="outline" onClick={() => router.push('/browse')}>
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => router.push('/browse')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Browse
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BookOpen className="h-5 w-5" />
              {book.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {book.description && (
              <p className="text-sm text-foreground/80">{book.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {book.authors.map((author) => (
                <Badge
                  key={author.id}
                  variant="outline"
                  className="gap-1.5 text-xs"
                >
                  <User className="h-3 w-3" />
                  {author.name}
                </Badge>
              ))}
              {book.categories.map((category) => (
                <Badge
                  key={category.id}
                  variant="outline"
                  className="gap-1.5 text-xs"
                >
                  <Tag className="h-3 w-3" />
                  {category.name}
                </Badge>
              ))}
              {book.publisher && (
                <Badge variant="outline" className="gap-1.5 text-xs">
                  <Building className="h-3 w-3" />
                  {book.publisher.name}
                </Badge>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-4 pt-2 text-sm">
              {book.isbn && (
                <div>
                  <dt className="text-muted-foreground">ISBN</dt>
                  <dd className="font-medium text-foreground">{book.isbn}</dd>
                </div>
              )}
              {book.language && (
                <div>
                  <dt className="text-muted-foreground">Language</dt>
                  <dd className="font-medium text-foreground">
                    {book.language}
                  </dd>
                </div>
              )}
              {book.pageCount && (
                <div>
                  <dt className="text-muted-foreground">Pages</dt>
                  <dd className="font-medium text-foreground">
                    {book.pageCount}
                  </dd>
                </div>
              )}
              {book.edition && (
                <div>
                  <dt className="text-muted-foreground">Edition</dt>
                  <dd className="font-medium text-foreground">
                    {book.edition}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Availability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">
                {availableCopies}
              </div>
              <div className="text-sm text-muted-foreground">
                {availableCopies === 1 ? 'copy' : 'copies'} available
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handlePlaceHold}
              disabled={isPlacingHold}
            >
              {isPlacingHold ? 'Placing Hold...' : 'Place a Hold'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              We&apos;ll notify you when a copy is ready for pickup.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
