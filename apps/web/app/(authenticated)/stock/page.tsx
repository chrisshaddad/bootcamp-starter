'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CalendarClock,
  Layers,
  Package,
  Plus,
  Search,
  TriangleAlert,
} from 'lucide-react';
import type { StockMedicineSummary } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { isReadOnlyStaff } from '@/lib/role-routes';
import { useStock, useStockBranches } from '@/hooks/use-stock';
import { AddBatchDialog } from '@/components/stock/add-batch-dialog';
import { QuantityPill } from '@/components/stock/quantity-pill';
import {
  expiryStatus,
  formatDate,
  formatPrice,
  isLowQuantity,
  medicineSubtitle,
} from '@/lib/stock';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ENTER, enterStyle } from '@/lib/enter-animation';

// Batch count as a soft neutral pill so the column carries a little colour too.
function BatchesCell({ count }: { count: number }) {
  return (
    <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-primary-100 px-2 py-0.5 text-sm font-medium text-primary-hover">
      {count}
    </span>
  );
}

function ExpiryCell({ value }: { value: string | Date | null }) {
  if (!value) return <span className="text-sm text-gray-400">—</span>;
  const status = expiryStatus(value);
  const dateColor =
    status === 'expired'
      ? 'text-error'
      : status === 'near'
        ? 'text-warning-dark'
        : 'text-gray-700';
  const badge =
    status === 'expired'
      ? 'bg-error/10 text-error'
      : 'bg-warning/10 text-warning-dark';
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`text-sm font-medium ${dateColor}`}>
        {formatDate(value)}
      </span>
      {status !== 'ok' ? (
        <span
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${badge}`}
        >
          {status === 'expired' ? 'Expired' : 'Near expiry'}
        </span>
      ) : null}
    </span>
  );
}

function StockRow({
  medicine,
  onOpen,
}: {
  medicine: StockMedicineSummary;
  onOpen: () => void;
}) {
  const subtitle = medicineSubtitle(medicine.form, medicine.dosage);
  return (
    <TableRow
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`View batches for ${medicine.brandName}`}
      className="group cursor-pointer transition-colors hover:bg-primary-50/60 focus-visible:bg-primary-50/60 focus-visible:outline-none"
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
            <Package className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900 group-hover:text-primary-hover">
              {medicine.brandName}
            </p>
            <p className="truncate text-sm text-gray-500">
              {[subtitle, medicine.barcode ? `#${medicine.barcode}` : null]
                .filter(Boolean)
                .join('  ·  ') || 'No details'}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm font-medium text-gray-900">
          {formatPrice(medicine.priceLbp)}
        </span>
      </TableCell>
      <TableCell>
        <QuantityPill quantity={medicine.totalQuantity} />
      </TableCell>
      <TableCell>
        <BatchesCell count={medicine.batchCount} />
      </TableCell>
      <TableCell>
        <ExpiryCell value={medicine.nearestExpiry} />
      </TableCell>
    </TableRow>
  );
}

type FlagFilter = 'all' | 'low' | 'expiring';
type SortKey = 'name' | 'quantity' | 'expiry';

// Each tile doubles as a filter. The two "total" tiles reset to the full list;
// the Low and Near/expired tiles narrow to matching medicines and highlight
// while active.
const STAT_TILES = [
  {
    key: 'MEDICINES',
    label: 'Medicines',
    icon: Package,
    iconClass: 'bg-primary-100 text-primary-hover',
    filter: 'all' as FlagFilter,
  },
  {
    key: 'UNITS',
    label: 'Total units',
    icon: Layers,
    iconClass: 'bg-success/10 text-success',
    filter: 'all' as FlagFilter,
  },
  {
    key: 'LOW',
    label: 'Low stock',
    icon: TriangleAlert,
    iconClass: 'bg-error/10 text-error',
    filter: 'low' as FlagFilter,
  },
  {
    key: 'EXPIRING',
    label: 'Near / expired',
    icon: CalendarClock,
    iconClass: 'bg-warning/15 text-warning-dark',
    filter: 'expiring' as FlagFilter,
  },
] as const;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'quantity', label: 'Quantity (low first)' },
  { value: 'expiry', label: 'Expiry (soonest)' },
];

function StockPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Keep the selected branch in the URL so a reload or back-navigation from the
  // detail page (which links to /stock?branchId=…) restores it instead of
  // silently falling back to the default branch.
  const branchId = searchParams.get('branchId') ?? undefined;
  const [search, setSearch] = useState('');
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [addOpen, setAddOpen] = useState(false);

  // A PHARMACY_EMPLOYEE sees this branch's stock read-only — no batch mutations.
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const readOnly = isReadOnlyStaff(user?.role);

  const {
    branches,
    error: branchesError,
    mutate: mutateBranches,
  } = useStockBranches();
  const {
    medicines,
    branchId: resolvedBranchId,
    branchName,
    isLoading,
    error,
    mutate,
  } = useStock({ branchId });

  // The branch actually in view: the admin's picked branch, or whatever the
  // server resolved (a stock manager's own branch / the admin's first branch).
  const activeBranchId = branchId ?? resolvedBranchId ?? undefined;
  const showBranchPicker = (branches?.length ?? 0) > 1;

  const stats: Record<string, number> = useMemo(() => {
    const list = medicines ?? [];
    return {
      MEDICINES: list.length,
      UNITS: list.reduce((sum, medicine) => sum + medicine.totalQuantity, 0),
      LOW: list.filter((medicine) => isLowQuantity(medicine.totalQuantity))
        .length,
      EXPIRING: list.filter(
        (medicine) => expiryStatus(medicine.nearestExpiry) !== 'ok',
      ).length,
    };
  }, [medicines]);

  const rows = useMemo(() => {
    if (!medicines) return medicines;
    const query = search.trim().toLowerCase();

    const filtered = medicines.filter((medicine) => {
      if (flagFilter === 'low' && !isLowQuantity(medicine.totalQuantity)) {
        return false;
      }
      if (
        flagFilter === 'expiring' &&
        expiryStatus(medicine.nearestExpiry) === 'ok'
      ) {
        return false;
      }
      if (
        query &&
        !medicine.brandName.toLowerCase().includes(query) &&
        !(medicine.barcode?.toLowerCase().includes(query) ?? false)
      ) {
        return false;
      }
      return true;
    });

    const expiryValue = (value: string | Date | null): number =>
      value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;

    return [...filtered].sort((a, b) => {
      if (sort === 'quantity') return a.totalQuantity - b.totalQuantity;
      if (sort === 'expiry') {
        return expiryValue(a.nearestExpiry) - expiryValue(b.nearestExpiry);
      }
      return a.brandName.localeCompare(b.brandName);
    });
  }, [medicines, search, flagFilter, sort]);

  return (
    <div className="space-y-6">
      <div
        className={`flex items-center justify-between gap-4 ${ENTER}`}
        style={enterStyle(0)}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock</h1>
          {branchName ? (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
              Managing inventory for
              <span className="inline-flex items-center gap-1 rounded-md bg-primary-100 px-2 py-0.5 text-sm font-semibold text-primary-hover">
                <Building2 className="h-3.5 w-3.5" />
                {branchName}
              </span>
              {showBranchPicker ? (
                <span className="text-gray-400">
                  — switch branch on the right before editing
                </span>
              ) : null}
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">
              Track medicine batches, quantities, and expiry dates.
            </p>
          )}
        </div>
        {readOnly ? null : (
          <Button
            type="button"
            size="lg"
            className="h-12 w-44 shrink-0 justify-center px-6 text-base"
            onClick={() => setAddOpen(true)}
            disabled={!activeBranchId}
          >
            <Plus className="h-5 w-5" />
            Add batch
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_TILES.map((tile, index) => {
          // Only the two filtering tiles (Low, Near/expired) show an active ring;
          // the total tiles just reset the view when clicked.
          const isActive = tile.filter !== 'all' && flagFilter === tile.filter;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() =>
                setFlagFilter((current) =>
                  current === tile.filter ? 'all' : tile.filter,
                )
              }
              aria-pressed={isActive}
              className={`${ENTER} text-left`}
              style={enterStyle(70 + index * 70)}
            >
              <Card
                className={`py-0 transition-all hover:border-primary-200 hover:shadow-sm ${
                  isActive ? 'border-primary-hover ring-2 ring-primary-100' : ''
                }`}
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${tile.iconClass}`}
                  >
                    <tile.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-500">
                      {tile.label}
                    </p>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-6 w-8" />
                    ) : (
                      <p className="text-xl font-semibold text-gray-900">
                        {stats[tile.key] ?? 0}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <div
        className={`flex flex-col gap-3 sm:flex-row sm:items-center ${ENTER}`}
        style={enterStyle(360)}
      >
        <div className="relative w-full sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search medicines by name or barcode…"
            className="h-9 w-full pl-9"
          />
        </div>
        <Select
          value={sort}
          onValueChange={(value) => setSort(value as SortKey)}
        >
          <SelectTrigger className="h-9 w-48">
            <ArrowUpDown className="h-4 w-4 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showBranchPicker ? (
          <div className="flex items-center gap-2 rounded-lg border-2 border-primary-200 bg-primary-50/50 px-2 py-1">
            <span className="flex items-center gap-1 pl-1 text-xs font-semibold uppercase tracking-wide text-primary-hover">
              <Building2 className="h-3.5 w-3.5" />
              Branch
            </span>
            <Select
              value={activeBranchId}
              onValueChange={(value) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('branchId', value);
                router.replace(`/stock?${params.toString()}`);
              }}
            >
              <SelectTrigger className="h-8 w-52 border-0 bg-white font-semibold text-gray-900 shadow-sm">
                <SelectValue placeholder="Select a branch" />
              </SelectTrigger>
              <SelectContent>
                {(branches ?? []).map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <Card
        className={`gap-0 overflow-hidden py-0 ${ENTER}`}
        style={enterStyle(420)}
      >
        {error || branchesError ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load stock
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              {branchesError && !error
                ? 'Something went wrong while loading your branches. Please try again.'
                : 'Something went wrong while fetching your inventory. Please try again.'}
            </p>
            <Button
              type="button"
              onClick={() => {
                mutate();
                mutateBranches();
              }}
            >
              Try again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 flex-1" />
              </div>
            ))}
          </div>
        ) : !rows || rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              No stock found
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              {medicines && medicines.length > 0
                ? 'No medicines match your search or filters.'
                : 'Add your first batch to start tracking inventory.'}
            </p>
          </div>
        ) : (
          <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:h-11 [&_th]:px-4 [&_th]:align-middle">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Medicine</TableHead>
                <TableHead className="w-36">Price</TableHead>
                <TableHead className="w-40">Total quantity</TableHead>
                <TableHead className="w-24">Batches</TableHead>
                <TableHead className="w-52">Nearest expiry</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((medicine) => (
                <StockRow
                  key={medicine.medicineId}
                  medicine={medicine}
                  onOpen={() =>
                    router.push(
                      activeBranchId
                        ? `/stock/${medicine.medicineId}?branchId=${activeBranchId}`
                        : `/stock/${medicine.medicineId}`,
                    )
                  }
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {addOpen ? (
        <AddBatchDialog
          branchId={activeBranchId}
          branchName={branchName}
          onClose={() => setAddOpen(false)}
        />
      ) : null}
    </div>
  );
}

// useSearchParams() must sit under a Suspense boundary so the route can be
// prerendered without bailing (mirrors the detail page).
export default function StockPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <StockPageContent />
    </Suspense>
  );
}
