'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { usePortalBook } from '@/hooks/use-portal-books';
import { usePortalBookCopies } from '@/hooks/use-portal-book-copies';
import { usePortalReservations } from '@/hooks/use-portal-reservations';
import { usePortalCart } from '@/hooks/use-portal-cart';
import { BookCover } from '@/components/book-cover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  User,
  Tag,
  Building,
  ShoppingCart,
  BookmarkPlus,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import {
  CONDITION_LABELS,
  sortByCondition,
  findConditionPrice,
  getBuyPriceRange,
  formatPriceRange,
} from '@/lib/book-condition';
import type { BookCopyCondition } from '@repo/contracts';

const NO_PREFERENCE = 'any';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const [isPlacingHold, setIsPlacingHold] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [holdCondition, setHoldCondition] = useState(NO_PREFERENCE);
  const [cartCondition, setCartCondition] = useState(NO_PREFERENCE);

  const { book, isLoading, error } = usePortalBook(bookId);
  const { bookCopies } = usePortalBookCopies(bookId);
  const { placeHold } = usePortalReservations({ enabled: false });
  const { addItem } = usePortalCart({ enabled: false });

  // Bug fix: a book with zero copies (of ANY status) can no longer place a
  // hold or be bought - matches the backend's assertBookHasCopies guard, so
  // a direct API call is blocked too, not just this button.
  const totalCopies = bookCopies?.length ?? 0;
  const isEverAvailable = totalCopies > 0;

  const conditionBreakdown = (bookCopies ?? []).reduce<
    Record<string, { total: number; available: number }>
  >((acc, copy) => {
    const entry = acc[copy.condition] ?? { total: 0, available: 0 };
    entry.total += 1;
    if (copy.status === 'AVAILABLE') entry.available += 1;
    acc[copy.condition] = entry;
    return acc;
  }, {});

  const pricedConditions = new Set(
    (book?.conditionPrices ?? []).map((cp) => cp.condition),
  );
  const buyableConditions = sortByCondition(
    Object.entries(conditionBreakdown)
      .filter(
        ([condition, counts]) =>
          counts.available > 0 &&
          pricedConditions.has(condition as BookCopyCondition),
      )
      .map(([condition]) => condition as BookCopyCondition),
  );
  const canBuy = buyableConditions.length > 0;
  const selectedBuyPrice =
    cartCondition === NO_PREFERENCE
      ? null
      : (findConditionPrice(
          book?.conditionPrices ?? [],
          cartCondition as BookCopyCondition,
        )?.buyPrice ?? null);

  const handlePlaceHold = async () => {
    setIsPlacingHold(true);
    try {
      await placeHold({
        bookId,
        preferredCondition:
          holdCondition === NO_PREFERENCE
            ? undefined
            : (holdCondition as BookCopyCondition),
      });
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

  const handleAddToCart = async () => {
    setIsAddingToCart(true);
    try {
      await addItem({
        bookId,
        preferredCondition:
          cartCondition === NO_PREFERENCE
            ? undefined
            : (cartCondition as BookCopyCondition),
      });
      toast.success('Added to cart');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to add to cart');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error || !book) {
    return (
      <div className="py-10 text-center">
        <div className="mb-4 text-error">Book not found</div>
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
        <div className="space-y-6 md:col-span-2">
          <Card>
            <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row">
              <BookCover
                coverUrl={book.coverUrl}
                title={book.title}
                className="h-60 w-40 shrink-0 self-start rounded-md"
              />

              <div className="space-y-4">
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    {book.title}
                  </h1>
                  {book.conditionPrices.length > 0 && (
                    <p className="mt-1 text-lg font-semibold text-library-primary">
                      {formatPriceRange(getBuyPriceRange(book.conditionPrices))}
                    </p>
                  )}
                </div>

                {book.description && (
                  <p className="text-sm text-foreground/80">
                    {book.description}
                  </p>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4 text-sm">
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isEverAvailable ? (
                <p className="text-center text-sm text-muted-foreground">
                  Not available in this library yet
                </p>
              ) : (
                sortByCondition(Object.keys(conditionBreakdown)).map(
                  (condition) => {
                    // Keys come directly from conditionBreakdown, so the
                    // entry always exists - TS just can't see that.
                    const counts = conditionBreakdown[condition]!;
                    return (
                      <div
                        key={condition}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-foreground">
                          {CONDITION_LABELS[condition as BookCopyCondition]}
                        </span>
                        <span className="text-muted-foreground">
                          {counts.available} available
                          <span className="text-muted-foreground/60">
                            {' '}
                            / {counts.total} total
                          </span>
                        </span>
                      </div>
                    );
                  },
                )
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reserve a Copy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={holdCondition} onValueChange={setHoldCondition}>
                <SelectTrigger
                  className="w-full"
                  disabled={!isEverAvailable}
                  aria-label="Preferred condition for hold"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PREFERENCE}>No preference</SelectItem>
                  {sortByCondition(Object.keys(conditionBreakdown)).map(
                    (condition) => (
                      <SelectItem key={condition} value={condition}>
                        {CONDITION_LABELS[condition as BookCopyCondition]}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              <Button
                className="w-full gap-2"
                variant="outline"
                onClick={handlePlaceHold}
                disabled={!isEverAvailable || isPlacingHold}
              >
                <BookmarkPlus className="h-4 w-4" />
                {isPlacingHold ? 'Placing Hold...' : 'Reserve a Copy'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Borrowing is free - you&apos;ll only be charged if a book is
                returned late. We&apos;ll notify you when a copy is ready for
                pickup.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buy a Copy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={cartCondition} onValueChange={setCartCondition}>
                <SelectTrigger
                  className="w-full"
                  disabled={!canBuy}
                  aria-label="Preferred condition to buy"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PREFERENCE}>No preference</SelectItem>
                  {buyableConditions.map((condition) => {
                    const price = findConditionPrice(
                      book.conditionPrices,
                      condition,
                    );
                    return (
                      <SelectItem key={condition} value={condition}>
                        {CONDITION_LABELS[condition]}
                        {price && ` — $${price.buyPrice}`}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                className="w-full gap-2"
                onClick={handleAddToCart}
                disabled={!canBuy || isAddingToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                {isAddingToCart ? 'Adding...' : 'Add to Cart'}
              </Button>
              {canBuy ? (
                <p className="text-center text-xs text-muted-foreground">
                  Price:{' '}
                  {selectedBuyPrice
                    ? `$${selectedBuyPrice}`
                    : formatPriceRange(getBuyPriceRange(book.conditionPrices))}
                </p>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  This title isn&apos;t available for purchase.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
