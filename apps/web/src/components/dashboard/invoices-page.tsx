'use client';

import { useMemo, useState } from 'react';
import { FileTextIcon, EyeIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

import { useListInvoicesQuery } from '@/store/api/endpoints/invoices.api';
import { useListBuildingsQuery } from '@/store/api/endpoints/buildings.api';
import type { InvoiceStatus } from '@/types/api';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUSES: InvoiceStatus[] = ['open', 'partially_paid', 'paid', 'overdue'];

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  open: 'Open',
  partially_paid: 'Partially paid',
  paid: 'Paid',
  overdue: 'Overdue',
};

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  partially_paid: 'bg-amber-50 text-amber-700 border-amber-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-red-50 text-red-700 border-red-200',
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="outline" className={STATUS_STYLES[status]}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const ALL = '__all__';

interface InvoicesPageProps {
  /** When false (supervisor), hide all write actions. There are none yet in this pass. */
  canWrite: boolean;
}

export function InvoicesPage({ canWrite }: InvoicesPageProps) {
  const { data: invoices, isLoading, isError } = useListInvoicesQuery();
  const { data: buildings } = useListBuildingsQuery();

  const [buildingFilter, setBuildingFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const buildingNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of buildings ?? []) map.set(b.id, b.name);
    return map;
  }, [buildings]);

  const filteredInvoices = useMemo(() => {
    return (invoices ?? []).filter((invoice) => {
      if (buildingFilter !== ALL && invoice.buildingId !== buildingFilter) {
        return false;
      }
      if (statusFilter !== ALL && invoice.status !== statusFilter) {
        return false;
      }
      const dueDate = invoice.dueDate.slice(0, 10);
      if (fromDate && dueDate < fromDate) return false;
      if (toDate && dueDate > toDate) return false;
      return true;
    });
  }, [invoices, buildingFilter, statusFilter, fromDate, toDate]);

  const hasAnyInvoices = (invoices?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Bills issued to renters — rent, late fees, utilities, and more.
          </p>
        </div>
        {!canWrite && (
          <Badge
            variant="outline"
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <EyeIcon className="size-3" />
            Read-only
          </Badge>
        )}
      </div>

      {/* Filters */}
      {hasAnyInvoices && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-building">Building</Label>
            <Select
              value={buildingFilter}
              onValueChange={(val) => setBuildingFilter(val ?? ALL)}
            >
              <SelectTrigger id="invoices-filter-building" className="w-44">
                <SelectValue placeholder="All buildings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All buildings</SelectItem>
                {(buildings ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-status">Status</Label>
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val ?? ALL)}
            >
              <SelectTrigger id="invoices-filter-status" className="w-44">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-from">Due from</Label>
            <Input
              id="invoices-filter-from"
              type="date"
              className="w-40"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invoices-filter-to">Due to</Label>
            <Input
              id="invoices-filter-to"
              type="date"
              className="w-40"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Invoices table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lease / Renter</TableHead>
              <TableHead>Building</TableHead>
              <TableHead>Due date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <>
                {[...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </>
            ) : isError ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  Failed to load invoices. Please try again.
                </TableCell>
              </TableRow>
            ) : !hasAnyInvoices ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  <FileTextIcon className="size-8 mx-auto mb-2 opacity-30" />
                  No invoices recorded yet.
                </TableCell>
              </TableRow>
            ) : filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  No invoices match the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-sm font-medium">
                    {invoice.renterName} · {invoice.apartmentUnitNumber}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {buildingNameById.get(invoice.buildingId) ??
                      invoice.buildingId}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(invoice.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {invoice.totalAmount}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {invoice.paidAmount}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={invoice.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
