'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Building2,
  MessageSquare,
  Pill,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import type { InquiryResponse, InquiryStatus } from '@repo/contracts';
import { useInquiries, useInquiryActions } from '@/hooks/use-inquiries';
import { ApiError } from '@/lib/api';
import {
  INQUIRY_STATUSES,
  INQUIRY_STATUS_META,
  formatRelative,
} from '@/lib/inquiries';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ENTER, enterStyle } from '@/lib/enter-animation';

type TabKey = 'ALL' | InquiryStatus;

// Inline status changer for a queue row. Lives inside a clickable row, so it
// stops click/keydown from bubbling — changing the status must not also open the
// thread. The trigger is tinted with the status colour, matching the old badge.
function StatusSelect({ inquiry }: { inquiry: InquiryResponse }) {
  const { updateStatus } = useInquiryActions();
  const [saving, setSaving] = useState(false);

  async function handleChange(next: InquiryStatus) {
    if (next === inquiry.status || saving) return;
    setSaving(true);
    try {
      await updateStatus(inquiry.id, { status: next });
      toast.success(`Marked as ${INQUIRY_STATUS_META[next].label}.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update status.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Select
        value={inquiry.status}
        onValueChange={(value) => handleChange(value as InquiryStatus)}
        disabled={saving}
      >
        <SelectTrigger
          aria-label="Change status"
          className={cn(
            'h-8 w-36 border-0 font-medium shadow-none',
            INQUIRY_STATUS_META[inquiry.status].badge,
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {INQUIRY_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {INQUIRY_STATUS_META[status].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InquiryRow({
  inquiry,
  onOpen,
}: {
  inquiry: InquiryResponse;
  onOpen: () => void;
}) {
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
      aria-label={`Open inquiry from ${inquiry.clientName}`}
      className="group cursor-pointer transition-colors hover:bg-primary-50/60 focus-visible:bg-primary-50/60 focus-visible:outline-none"
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
            <User className="h-4 w-4" />
          </div>
          <span className="truncate font-medium text-gray-900 group-hover:text-primary-hover">
            {inquiry.clientName}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
          <Pill className="h-3.5 w-3.5 text-gray-400" />
          {inquiry.medicineName}
        </span>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
          <Building2 className="h-3.5 w-3.5 text-gray-400" />
          {inquiry.branchName}
        </span>
      </TableCell>
      <TableCell>
        <StatusSelect inquiry={inquiry} />
      </TableCell>
      <TableCell>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm font-medium',
            INQUIRY_STATUS_META[inquiry.status].badge,
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {inquiry.messageCount}
        </span>
      </TableCell>
      <TableCell className="text-sm text-gray-500">
        {formatRelative(inquiry.lastUpdatedAt)}
      </TableCell>
    </TableRow>
  );
}

export default function InquiriesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>('ALL');

  const { branchName, inquiries, counts, total, isLoading, error, mutate } =
    useInquiries();

  const rows = useMemo(() => {
    if (!inquiries) return inquiries;
    if (tab === 'ALL') return inquiries;
    return inquiries.filter((inquiry) => inquiry.status === tab);
  }, [inquiries, tab]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: total ?? 0 },
    ...INQUIRY_STATUSES.map((status) => ({
      key: status,
      label: INQUIRY_STATUS_META[status].label,
      count: counts?.[status] ?? 0,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className={ENTER} style={enterStyle(0)}>
        <h1 className="text-2xl font-bold text-gray-900">Inquiries</h1>
        {branchName ? (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-gray-500">
            Answering client questions for
            <span className="inline-flex items-center gap-1 rounded-md bg-primary-100 px-2 py-0.5 text-sm font-semibold text-primary-hover">
              <Building2 className="h-3.5 w-3.5" />
              {branchName}
            </span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-500">
            Answer client questions about medicine availability at your branch.
          </p>
        )}
      </div>

      {/* Status tabs */}
      <div
        className={`flex flex-wrap gap-2 ${ENTER}`}
        style={enterStyle(70)}
        role="tablist"
        aria-label="Filter inquiries by status"
      >
        {tabs.map((item) => {
          const isActive = tab === item.key;
          // Status tabs carry their own colour (a dot always, a filled style when
          // selected); the "All" tab stays neutral.
          const meta =
            item.key === 'ALL' ? null : INQUIRY_STATUS_META[item.key];
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(item.key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? (meta?.activeTab ??
                      'border-primary-hover bg-primary-100 text-gray-900')
                  : 'border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              {meta ? (
                <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
              ) : null}
              {item.label}
              <span
                className={cn(
                  'inline-flex min-w-5 items-center justify-center rounded-md px-1.5 text-xs',
                  isActive
                    ? 'bg-white/70 text-current'
                    : 'bg-gray-100 text-gray-500',
                )}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      <Card
        className={`gap-0 overflow-hidden py-0 ${ENTER}`}
        style={enterStyle(140)}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load inquiries
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              Something went wrong while fetching your branch queue. Please try
              again.
            </p>
            <Button type="button" onClick={() => mutate()}>
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
            <MessageSquare className="mb-4 h-12 w-12 text-gray-300" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              No inquiries here
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              {inquiries && inquiries.length > 0
                ? 'No inquiries match this status.'
                : 'When clients ask about medicines at your branch, they show up here.'}
            </p>
          </div>
        ) : (
          <Table className="[&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:h-11 [&_th]:px-4 [&_th]:align-middle">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Client</TableHead>
                <TableHead>Medicine</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-24">Messages</TableHead>
                <TableHead className="w-40">Last updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((inquiry) => (
                <InquiryRow
                  key={inquiry.id}
                  inquiry={inquiry}
                  onOpen={() => router.push(`/inquiries/${inquiry.id}`)}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
