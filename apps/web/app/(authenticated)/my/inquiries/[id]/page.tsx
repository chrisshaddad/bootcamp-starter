'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Lock,
  Pill,
  RotateCcw,
  Send,
} from 'lucide-react';
import type {
  ClientInquiryDetailResponse,
  InquiryStatus,
} from '@repo/contracts';
import {
  useMyInquiryDetail,
  useMyInquiryActions,
} from '@/hooks/use-my-inquiries';
import { INQUIRY_STATUS_META, formatDateTime } from '@/lib/inquiries';
import { formatPrice } from '@/lib/stock';
import { ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ENTER, enterStyle } from '@/lib/enter-animation';
import { cn } from '@/lib/utils';

type Message = ClientInquiryDetailResponse['messages'][number];

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

// Client messages sit on the right in brand green (the reader's own voice);
// pharmacy replies on the left in gray.
function Bubble({ message }: { message: Message }) {
  const isClient = message.senderType === 'CLIENT';
  return (
    <div className={cn('flex', isClient ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
          isClient
            ? 'rounded-br-sm bg-primary-hover text-white'
            : 'rounded-bl-sm bg-gray-100 text-gray-900',
        )}
      >
        <p className="break-words whitespace-pre-wrap">{message.message}</p>
        <p
          className={cn(
            'mt-1 text-[11px]',
            isClient ? 'text-white/70' : 'text-gray-400',
          )}
        >
          {isClient ? 'You' : (message.senderName ?? 'Pharmacy')} ·{' '}
          {formatDateTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

export default function MyInquiryThreadPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { inquiry, isLoading, error, mutate } = useMyInquiryDetail(id);
  const { sendMessage, updateStatus } = useMyInquiryActions();

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  // Keep the thread pinned to the newest message — scroll the thread container
  // itself (not scrollIntoView, which would also scroll the whole page).
  const threadRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [inquiry?.messages.length]);

  const isClosed = inquiry?.status === 'CLOSED';

  async function handleSend() {
    const message = draft.trim();
    if (!message || !id || sending) return;
    setSending(true);
    try {
      await sendMessage(id, { message });
      setDraft('');
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to send your message.',
      );
    } finally {
      setSending(false);
    }
  }

  async function handleStatus(next: 'CLOSED' | 'PENDING') {
    if (!id || statusBusy) return;
    setStatusBusy(true);
    try {
      await updateStatus(id, { status: next });
      await mutate();
      toast.success(
        next === 'CLOSED' ? 'Inquiry closed.' : 'Inquiry reopened.',
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update the inquiry.',
      );
    } finally {
      setStatusBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className={ENTER} style={enterStyle(0)}>
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8">
          <Link href="/my/inquiries">
            <ArrowLeft className="h-4 w-4" />
            My inquiries
          </Link>
        </Button>
      </div>

      {error ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load this inquiry
            </h3>
            <p className="max-w-md text-center text-sm text-gray-500">
              It may not exist, or it isn&apos;t one of yours.
            </p>
          </CardContent>
        </Card>
      ) : isLoading || !inquiry ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Context header */}
          <Card className={cn('py-0', ENTER)} style={enterStyle(70)}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-hover">
                    <Pill className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/find/${inquiry.medicine.id}`}
                      className="truncate text-lg font-bold text-gray-900 hover:text-primary-hover"
                    >
                      {inquiry.medicine.brandName}
                    </Link>
                    <p className="flex items-center gap-1 truncate text-sm text-gray-500">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      {inquiry.pharmacyName} · {inquiry.branchName}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusPill status={inquiry.status} />
                  {isClosed ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={statusBusy}
                      onClick={() => handleStatus('PENDING')}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reopen
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={statusBusy}
                      onClick={() => handleStatus('CLOSED')}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Close
                    </Button>
                  )}
                </div>
              </div>
              {inquiry.medicine.priceLbp !== null ? (
                <p className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-500">
                  Catalog price:{' '}
                  <span className="font-medium text-gray-900">
                    {formatPrice(inquiry.medicine.priceLbp)}
                  </span>
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card
            className={cn('gap-0 overflow-hidden py-0', ENTER)}
            style={enterStyle(140)}
          >
            <div
              ref={threadRef}
              className="max-h-[55vh] min-h-64 space-y-3 overflow-y-auto p-4"
            >
              {inquiry.messages.map((message) => (
                <Bubble key={message.id} message={message} />
              ))}
            </div>

            {/* Composer / closed notice */}
            {isClosed ? (
              <div className="flex items-center justify-center gap-2 border-t border-border bg-gray-50 px-4 py-4 text-sm text-gray-500">
                <Lock className="h-4 w-4" />
                This inquiry is closed. Reopen it to continue the conversation.
              </div>
            ) : (
              <div className="flex items-end gap-2 border-t border-border p-3">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="Write a message…"
                  disabled={sending}
                  className="max-h-32 min-h-10 flex-1 resize-none rounded-[10px] border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-gray-500 focus-visible:border-primary-hover focus-visible:ring-[3px] focus-visible:ring-primary-100 disabled:opacity-50"
                />
                <Button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={sending || !draft.trim()}
                  className="h-10 shrink-0"
                >
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
