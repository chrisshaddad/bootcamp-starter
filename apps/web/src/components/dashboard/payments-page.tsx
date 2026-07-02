'use client';

import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DollarSign, EyeIcon } from 'lucide-react';
import { useListPaymentsQuery } from '@/store/api/endpoints/payments.api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface PaymentsPageProps {
  locale: string;
  /** When true (supervisor), show read-only badge and hide any future write actions. */
  readonly?: boolean;
}

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

export function PaymentsPage({ locale, readonly = false }: PaymentsPageProps) {
  const dateLocale = locale === 'ar' ? ar : undefined;
  const { data: paymentsData, isLoading } = useListPaymentsQuery();

  const payments = paymentsData?.data ?? [];

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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {readonly
              ? 'Payment records for your organization (read-only).'
              : 'Payment records and financial overview.'}
          </p>
        </div>
        {readonly && (
          <Badge
            variant="outline"
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <EyeIcon className="size-3" />
            Read-only
          </Badge>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Total paid this month
            </p>
            {isLoading ? (
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
            <p className="text-sm text-muted-foreground">Total payments</p>
            {isLoading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-semibold mt-1">
                {paymentsData?.total ?? payments.length}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payments table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
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
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
            <DollarSign className="h-10 w-10 opacity-30" />
            <p className="text-sm">No payments recorded yet.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((row) => {
                const invoiceDisplay = row.stripeInvoiceId
                  ? row.stripeInvoiceId.length > 14
                    ? row.stripeInvoiceId.slice(0, 14) + '…'
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
                    <TableCell className="font-medium">
                      {formattedAmount}
                    </TableCell>
                    <TableCell>{getStatusBadge(row.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(row.createdAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {invoiceDisplay}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
