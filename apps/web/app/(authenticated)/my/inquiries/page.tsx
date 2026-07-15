'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  MessageSquare,
  Pill,
  Search,
} from 'lucide-react';
import type { ClientInquiry, InquiryStatus } from '@repo/contracts';
import { useMyInquiries } from '@/hooks/use-my-inquiries';
import {
  INQUIRY_STATUS_META,
  INQUIRY_STATUSES,
  formatRelative,
} from '@/lib/inquiries';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';
import { cn } from '@/lib/utils';

function StatusPill({ status }: { status: InquiryStatus }) {
  const meta = INQUIRY_STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        meta.badge,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

function InquiryCard({ inquiry }: { inquiry: ClientInquiry }) {
  // "The ball is in your court": the pharmacy spoke last on an open thread.
  const awaitingClient =
    inquiry.lastMessageSenderType === 'EMPLOYEE' && inquiry.status !== 'CLOSED';
  return (
    <Link href={`/my/inquiries/${inquiry.id}`} className="group block">
      <Card
        className={cn(
          'h-full overflow-hidden py-0 transition-shadow hover:shadow-md',
          'border-l-4',
          INQUIRY_STATUS_META[inquiry.status].rowAccent,
        )}
      >
        <CardContent className="p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-hover">
                <Pill className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-900">
                  {inquiry.medicineName}
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-gray-500">
                  <Building2 className="h-3 w-3 shrink-0" />
                  {inquiry.pharmacyName} · {inquiry.branchName}
                </p>
              </div>
            </div>
            <StatusPill status={inquiry.status} />
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MessageSquare className="h-3.5 w-3.5" />
              {inquiry.messageCount}
              <span aria-hidden>·</span>
              {formatRelative(inquiry.lastMessageAt ?? inquiry.lastUpdatedAt)}
            </div>
            {awaitingClient ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-hover">
                Pharmacy replied
              </span>
            ) : (
              <ArrowRight className="h-4 w-4 text-gray-300 transition-colors group-hover:text-primary-hover" />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

const TABS: (InquiryStatus | 'ALL')[] = ['ALL', ...INQUIRY_STATUSES];

export default function MyInquiriesPage() {
  const [tab, setTab] = useState<InquiryStatus | 'ALL'>('ALL');
  const { inquiries, counts, isLoading, error } = useMyInquiries(
    tab === 'ALL' ? undefined : tab,
  );

  const totalAll = counts
    ? Object.values(counts).reduce((sum, n) => sum + n, 0)
    : undefined;

  return (
    <div className="space-y-6">
      <div
        className={cn('flex items-start justify-between gap-4', ENTER)}
        style={enterStyle(0)}
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My inquiries</h1>
          <p className="mt-1 text-sm text-gray-500">
            Your questions to pharmacies and their replies, all in one place.
          </p>
        </div>
        <Button asChild size="lg" className="h-11 shrink-0">
          <Link href="/find">
            <Search className="h-4 w-4" />
            Find a medicine
          </Link>
        </Button>
      </div>

      {/* Status tabs */}
      <div className={cn('flex flex-wrap gap-2', ENTER)} style={enterStyle(70)}>
        {TABS.map((value) => {
          const active = tab === value;
          const count =
            value === 'ALL' ? totalAll : (counts?.[value] ?? undefined);
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                active
                  ? value === 'ALL'
                    ? 'border-primary-hover bg-primary-100 text-primary-hover'
                    : INQUIRY_STATUS_META[value].activeTab
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {value === 'ALL' ? 'All' : INQUIRY_STATUS_META[value].label}
              {count !== undefined ? (
                <span className="text-xs text-gray-400">{count}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load your inquiries
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              Something went wrong. Please try again.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : !inquiries || inquiries.length === 0 ? (
        <Card className={cn('py-0', ENTER)} style={enterStyle(140)}>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 text-primary-hover">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              {tab === 'ALL'
                ? 'No inquiries yet'
                : `No ${INQUIRY_STATUS_META[tab].label.toLowerCase()} inquiries`}
            </h3>
            <p className="mb-4 max-w-md text-sm text-gray-500">
              Find a medicine and ask a nearby pharmacy about availability —
              your conversations will show up here.
            </p>
            <Button asChild>
              <Link href="/find">
                <Search className="h-4 w-4" />
                Find a medicine
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn('grid grid-cols-1 gap-4 md:grid-cols-2', ENTER)}
          style={enterStyle(140)}
        >
          {inquiries.map((inquiry) => (
            <InquiryCard key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  );
}
