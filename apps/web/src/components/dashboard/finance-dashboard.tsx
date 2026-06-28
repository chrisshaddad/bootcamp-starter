'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DollarSign } from 'lucide-react';
import { useListPaymentsQuery } from '@/store/api/endpoints/payments.api';
import { useListTimelineQuery } from '@/store/api/endpoints/timeline.api';
import type { MeResponse } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface FinanceDashboardProps {
  me: MeResponse | null;
  locale: string;
}

function humanizeAction(action: string): string {
  const humanized = action.replace(/\./g, ' ');
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}

export function FinanceDashboard({ me, locale }: FinanceDashboardProps) {
  const dateLocale = locale === 'ar' ? ar : undefined;

  const { data: paymentsData, isLoading: paymentsLoading } =
    useListPaymentsQuery();
  const { data: timelineData, isLoading: timelineLoading } =
    useListTimelineQuery({ limit: 10 });

  const payments = paymentsData?.data ?? [];
  const timelineEvents = (timelineData?.data ?? []).slice(0, 5);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const paidThisMonth = payments.filter((row) => {
    if (row.status !== 'PAID') return false;
    const d = new Date(row.paidAt ?? row.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalPaidThisMonth = paidThisMonth.reduce(
    (sum, row) => sum + parseFloat(row.amount),
    0,
  );

  const firstPaidCurrency =
    paidThisMonth[0]?.currency ?? payments[0]?.currency ?? 'USD';

  const formattedTotalPaid = totalPaidThisMonth.toLocaleString(
    locale === 'ar' ? 'ar-SA' : 'en-US',
    { style: 'currency', currency: firstPaidCurrency.toUpperCase() },
  );

  function getStatusBadge(status: string) {
    switch (status) {
      case 'PAID':
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-200"
          >
            Paid
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-800 border-yellow-200"
          >
            Pending
          </Badge>
        );
      case 'FAILED':
        return <Badge variant="destructive">Failed</Badge>;
      case 'REFUNDED':
        return <Badge variant="secondary">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payments & Finance</CardTitle>
          <CardDescription>{me?.org?.name}</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Total Paid This Month
            </p>
            {paymentsLoading ? (
              <Skeleton className="h-7 w-32 mt-1" />
            ) : (
              <p className="text-2xl font-semibold mt-1">
                {formattedTotalPaid}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            {paymentsLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-semibold mt-1">
                {paymentsData?.total ?? payments.length}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          {paymentsLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <DollarSign className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No payments recorded yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((row) => {
                  const invoiceDisplay = row.stripeInvoiceId
                    ? row.stripeInvoiceId.length > 12
                      ? row.stripeInvoiceId.slice(0, 12) + '…'
                      : row.stripeInvoiceId
                    : '—';

                  const formattedAmount = parseFloat(row.amount).toLocaleString(
                    locale === 'ar' ? 'ar-SA' : 'en-US',
                    { style: 'currency', currency: row.currency.toUpperCase() },
                  );

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        {format(new Date(row.createdAt), 'MMM d, yyyy', {
                          locale: dateLocale,
                        })}
                      </TableCell>
                      <TableCell>{formattedAmount}</TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {invoiceDisplay}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Recent Activity
        </h3>
        {timelineLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : timelineEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-2">
            {timelineEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0"
              >
                <p className="text-sm">{humanizeAction(event.action)}</p>
                <p className="text-xs text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(event.createdAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
