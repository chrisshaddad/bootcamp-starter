'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-auth';
import { usePortalCart } from '@/hooks/use-portal-cart';
import { BookCover } from '@/components/book-cover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingCart, Trash2, CheckCircle2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import type { CheckoutResponse } from '@repo/contracts';

const CONDITION_LABELS: Record<string, string> = {
  NEW: 'New',
  GOOD: 'Good',
  FAIR: 'Fair',
  POOR: 'Poor',
  DAMAGED: 'Damaged',
};

export default function CartPage() {
  const { user, isLoading: userLoading } = useUser();
  const hasActiveLibrary = !!user?.activeOrganizationId;
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [receipt, setReceipt] = useState<CheckoutResponse | null>(null);

  const { items, isLoading, error, removeItem, checkout } = usePortalCart({
    enabled: hasActiveLibrary,
  });

  const total = (items ?? []).reduce(
    (sum, item) => sum + Number(item.book.salePrice ?? 0),
    0,
  );

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      await removeItem(itemId);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to remove item');
      }
    } finally {
      setRemovingId(null);
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const result = await checkout();
      setReceipt(result);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Checkout failed');
      }
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (userLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!hasActiveLibrary) {
    return (
      <div className="py-20 text-center">
        <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/60" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">
          Select a library first
        </h2>
        <a
          href="/my-libraries"
          className="mt-4 inline-block text-sm text-library-primary hover:underline"
        >
          Go to My Libraries
        </a>
      </div>
    );
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-10 text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-success" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Purchase complete
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You bought {receipt.purchases.length}{' '}
            {receipt.purchases.length === 1 ? 'book' : 'books'} for $
            {receipt.total}
          </p>
        </div>

        <div className="space-y-3 text-left">
          {receipt.purchases.map((purchase) => (
            <Card key={purchase.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <BookCover
                  coverUrl={purchase.bookCopy.book.coverUrl}
                  title={purchase.bookCopy.book.title}
                  className="h-20 w-14 shrink-0 rounded-sm"
                />
                <div className="flex-1">
                  <div className="font-medium text-foreground">
                    {purchase.bookCopy.book.title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {CONDITION_LABELS[purchase.bookCopy.condition]} condition
                  </div>
                </div>
                <div className="font-semibold text-foreground">
                  ${purchase.price}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => setReceipt(null)}>
            Back to Cart
          </Button>
          <Button asChild>
            <Link href="/browse">Continue Browsing</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Cart</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Books you&apos;ve selected to buy
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : error ? (
        <div className="py-10 text-center text-error">
          Failed to load your cart
        </div>
      ) : !items?.length ? (
        <div className="py-20 text-center text-muted-foreground">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <p className="mt-4">Your cart is empty</p>
          <Link
            href="/browse"
            className="mt-2 inline-block text-sm text-library-primary hover:underline"
          >
            Browse books to buy
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <BookCover
                    coverUrl={item.book.coverUrl}
                    title={item.book.title}
                    className="h-20 w-14 shrink-0 rounded-sm"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {item.book.title}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.preferredCondition
                        ? `${CONDITION_LABELS[item.preferredCondition]} condition`
                        : 'Any condition'}
                    </div>
                  </div>
                  <div className="font-semibold text-foreground">
                    {item.book.salePrice ? `$${item.book.salePrice}` : '—'}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-error"
                    disabled={removingId === item.id}
                    onClick={() => handleRemove(item.id)}
                    aria-label={`Remove ${item.book.title} from cart`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {items.length} {items.length === 1 ? 'item' : 'items'}
                </span>
                <span className="font-semibold text-foreground">
                  ${total.toFixed(2)}
                </span>
              </div>
              <Button
                className="w-full"
                onClick={handleCheckout}
                disabled={isCheckingOut}
              >
                {isCheckingOut ? 'Placing Order...' : 'Checkout'}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                This is a mock checkout - no real payment is processed.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
