import Link from 'next/link';
import {
  Bookmark,
  CalendarClock,
  Clock,
  DollarSign,
  PackageCheck,
  ShoppingBag,
} from 'lucide-react';
import type { PortalDashboardSummaryResponse } from '@repo/contracts';
import { StatTile } from './stat-tile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function formatDueDate(due: string | Date): string {
  return new Date(due).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function PatronDashboard({
  summary,
}: {
  summary: PortalDashboardSummaryResponse;
}) {
  const finesOwed = Number(summary.totalFinesOwed);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile
          label="Active rentals"
          value={summary.activeRentals}
          icon={Clock}
        />
        <StatTile
          label="Overdue"
          value={summary.overdueRentals}
          icon={CalendarClock}
          tone={summary.overdueRentals > 0 ? 'text-error' : undefined}
        />
        <StatTile
          label="Fines owed"
          value={`$${finesOwed.toFixed(2)}`}
          icon={DollarSign}
          tone={finesOwed > 0 ? 'text-error' : undefined}
        />
        <StatTile
          label="Active reservations"
          value={summary.activeReservations}
          icon={Bookmark}
        />
        <StatTile
          label="Ready for pickup"
          value={summary.readyForPickup}
          icon={PackageCheck}
          tone={summary.readyForPickup > 0 ? 'text-success-dark' : undefined}
        />
        <StatTile
          label="Purchases"
          value={summary.totalPurchases}
          icon={ShoppingBag}
        />
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-semibold text-foreground">
            Due soon
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.upcomingDue.length > 0 ? (
            <ul className="divide-y divide-border">
              {summary.upcomingDue.map((rental, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-foreground">{rental.bookTitle}</span>
                    <span className="text-xs text-muted-foreground">
                      {rental.libraryName}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    Due {formatDueDate(rental.dueDate)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              Nothing due soon.{' '}
              <Link
                href="/discover"
                className="text-library-primary hover:underline"
              >
                Browse libraries
              </Link>{' '}
              to borrow a book.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
