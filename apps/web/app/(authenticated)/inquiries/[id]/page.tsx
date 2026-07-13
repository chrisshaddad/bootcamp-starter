'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarClock,
  Layers,
  Mail,
  MessageSquare,
  Phone,
  Pill,
  Send,
  User,
} from 'lucide-react';
import {
  inquiryReplyRequestSchema,
  type InquiryMessageResponse,
  type InquiryReplyRequest,
  type InquiryStatus,
} from '@repo/contracts';
import { useInquiryDetail, useInquiryActions } from '@/hooks/use-inquiries';
import { useReadOnlyStaff } from '@/hooks/use-auth';
import { ApiError } from '@/lib/api';
import {
  INQUIRY_STATUSES,
  INQUIRY_STATUS_META,
  formatDateTime,
} from '@/lib/inquiries';
import {
  expiryStatus,
  formatDate,
  isLowQuantity,
  typeLabel,
} from '@/lib/stock';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { ENTER, enterStyle } from '@/lib/enter-animation';

function MessageBubble({ message }: { message: InquiryMessageResponse }) {
  const isEmployee = message.senderType === 'EMPLOYEE';
  return (
    <div
      className={cn(
        'flex flex-col gap-1',
        isEmployee ? 'items-end' : 'items-start',
      )}
    >
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
          isEmployee
            ? 'rounded-br-sm bg-primary-hover text-white'
            : 'rounded-bl-sm bg-gray-100 text-gray-900',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.message}</p>
      </div>
      <span className="px-1 text-xs text-gray-400">
        {message.senderName ?? (isEmployee ? 'Staff' : 'Client')} ·{' '}
        {formatDateTime(message.createdAt)}
      </span>
    </div>
  );
}

// A labelled row in the context panel (client / medicine details).
function InfoRow({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <span className="min-w-0 break-words text-gray-700">{children}</span>
    </div>
  );
}

export default function InquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { inquiry, isLoading, error, mutate } = useInquiryDetail(id);
  const { reply, updateStatus } = useInquiryActions();

  // A PHARMACY_EMPLOYEE reads the thread but cannot reply or change its status.
  const readOnly = useReadOnlyStaff();

  const [statusSaving, setStatusSaving] = useState(false);

  // The reply box is validated against the shared contract (@repo/contracts) via
  // zodResolver, so the form and the API enforce the same trim/length rules.
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InquiryReplyRequest>({
    resolver: zodResolver(inquiryReplyRequestSchema),
    defaultValues: { message: '' },
  });
  const draft = watch('message');

  // Keep the thread pinned to the latest message. Only fires when the message
  // count actually grows (a new reply), so the 10s poll doesn't yank the view
  // while the officer is scrolled up reading history.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageCount = inquiry?.messages.length ?? 0;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messageCount, id]);

  const handleReply = handleSubmit(async ({ message }) => {
    try {
      await reply(id, { message });
      reset({ message: '' });
      toast.success('Reply sent.');
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to send reply.',
      );
    }
  });

  async function handleStatusChange(next: InquiryStatus) {
    if (!inquiry || next === inquiry.status || statusSaving) return;
    setStatusSaving(true);
    try {
      await updateStatus(id, { status: next });
      toast.success(`Marked as ${INQUIRY_STATUS_META[next].label}.`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update status.',
      );
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className={`shrink-0 ${ENTER}`} style={enterStyle(0)}>
        <Link
          href="/inquiries"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inquiries
        </Link>
      </div>

      {error ? (
        <Card className="py-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertTriangle className="mb-4 h-12 w-12 text-error" />
            <h3 className="mb-1 text-lg font-semibold text-gray-900">
              Couldn&apos;t load this inquiry
            </h3>
            <p className="mb-4 max-w-md text-center text-sm text-gray-500">
              {error instanceof ApiError && error.status === 404
                ? 'This inquiry could not be found for your branch.'
                : 'Something went wrong. Please try again.'}
            </p>
            <Button type="button" onClick={() => mutate()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : isLoading || !inquiry ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 w-full lg:col-span-2" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : (
        <div className="grid flex-1 gap-6 lg:min-h-0 lg:grid-cols-3">
          {/* Conversation */}
          <div
            className={`flex flex-col gap-4 lg:col-span-2 lg:min-h-0 ${ENTER}`}
            style={enterStyle(70)}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <MessageSquare className="h-5 w-5 text-primary-hover" />
                Conversation
              </div>
              <div className="flex items-center gap-2">
                <span id="status-label" className="text-sm text-gray-500">
                  Status
                </span>
                {readOnly ? (
                  <span
                    className={cn(
                      'inline-flex h-9 w-40 items-center gap-1.5 rounded-md px-3 text-sm font-medium',
                      INQUIRY_STATUS_META[inquiry.status].badge,
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        INQUIRY_STATUS_META[inquiry.status].dot,
                      )}
                    />
                    {INQUIRY_STATUS_META[inquiry.status].label}
                  </span>
                ) : (
                  <Select
                    value={inquiry.status}
                    onValueChange={(value) =>
                      handleStatusChange(value as InquiryStatus)
                    }
                    disabled={statusSaving}
                  >
                    <SelectTrigger
                      id="status-trigger"
                      className="h-9 w-40"
                      aria-labelledby="status-label status-trigger"
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
                )}
              </div>
            </div>

            <Card className="flex min-h-0 flex-1 flex-col py-0">
              <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-white hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
                {inquiry.messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No messages yet.
                  </p>
                ) : (
                  inquiry.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </CardContent>
            </Card>

            {/* Reply box — hidden for a read-only PHARMACY_EMPLOYEE, who can
                read the thread but not respond. Enter sends, Shift+Enter
                newlines. */}
            {readOnly ? (
              <p className="shrink-0 rounded-[10px] border border-dashed border-gray-200 px-4 py-3 text-center text-sm text-gray-500">
                You have read-only access to inquiries — replying is disabled.
              </p>
            ) : (
              <form onSubmit={handleReply} className="shrink-0 space-y-2">
                <textarea
                  {...register('message')}
                  onKeyDown={(event) => {
                    // Enter sends; Shift+Enter inserts a newline. Skip while an IME
                    // composition is active so typing e.g. Arabic/CJK isn't cut off.
                    if (
                      event.key === 'Enter' &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing &&
                      !isSubmitting
                    ) {
                      event.preventDefault();
                      void handleReply();
                    }
                  }}
                  rows={2}
                  maxLength={4000}
                  placeholder="Write a reply…"
                  aria-invalid={!!errors.message}
                  className="w-full resize-none rounded-[10px] border border-gray-300 bg-transparent px-4 py-3 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-gray-500 focus-visible:border-success focus-visible:ring-[3px] focus-visible:ring-success/20 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                />
                {errors.message && (
                  <p className="text-sm text-error">{errors.message.message}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Sending a reply moves this inquiry to In progress.
                  </span>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !draft?.trim()}
                  >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? 'Sending…' : 'Send reply'}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Context panel */}
          <div
            className={`flex flex-col gap-4 lg:min-h-0 ${ENTER}`}
            style={enterStyle(140)}
          >
            <Card className="shrink-0 py-0">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <User className="h-4 w-4 text-primary-hover" />
                  Client
                </div>
                <p className="font-medium text-gray-900">
                  {inquiry.client.name}
                </p>
                <InfoRow icon={Mail}>{inquiry.client.email}</InfoRow>
                <InfoRow icon={Phone}>
                  {inquiry.client.phoneNumber ?? (
                    <span className="text-gray-400">No phone on file</span>
                  )}
                </InfoRow>
              </CardContent>
            </Card>

            <Card className="flex min-h-0 flex-1 flex-col py-0">
              <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-white hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Pill className="h-4 w-4 text-primary-hover" />
                  Medicine
                </div>
                <p className="font-medium text-gray-900">
                  {inquiry.medicine.brandName}
                </p>

                {/* Every displayable catalog field, missing ones omitted. */}
                {(() => {
                  const m = inquiry.medicine;
                  const fields: { label: string; value: string }[] = [];
                  if (m.priceLbp != null) {
                    fields.push({
                      label: 'Price',
                      value: `${m.priceLbp.toLocaleString()} LBP`,
                    });
                  }
                  if (m.form) fields.push({ label: 'Form', value: m.form });
                  if (m.dosage) {
                    fields.push({ label: 'Dosage', value: m.dosage });
                  }
                  if (m.type) {
                    fields.push({ label: 'Type', value: typeLabel(m.type) });
                  }
                  if (m.ingredients.length > 0) {
                    fields.push({
                      label: 'Ingredients',
                      value: m.ingredients.join(', '),
                    });
                  }
                  if (m.barcode) {
                    fields.push({ label: 'Barcode', value: m.barcode });
                  }
                  if (m.atcCode) {
                    fields.push({ label: 'ATC code', value: m.atcCode });
                  }
                  if (m.mophId) {
                    fields.push({ label: 'MoPH ID', value: m.mophId });
                  }
                  if (fields.length === 0) return null;
                  return (
                    <dl className="grid grid-cols-1 gap-2">
                      {fields.map((field) => (
                        <div
                          key={field.label}
                          className="flex items-baseline justify-between gap-3"
                        >
                          <dt className="shrink-0 text-xs uppercase tracking-wide text-gray-400">
                            {field.label}
                          </dt>
                          <dd className="text-right text-sm text-gray-900">
                            {field.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  );
                })()}

                {/* Live stock for this medicine at this branch */}
                <div className="mt-1 space-y-2 rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
                    <Building2 className="h-3.5 w-3.5" />
                    Stock at {inquiry.branchName}
                  </div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-semibold text-gray-900">
                      {inquiry.stock.totalQuantity} in stock
                    </span>
                    {inquiry.stock.batchCount > 0 &&
                    isLowQuantity(inquiry.stock.totalQuantity) ? (
                      <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-warning-dark">
                        Low
                      </span>
                    ) : null}
                    {inquiry.stock.batchCount === 0 ? (
                      <span className="rounded-md bg-error/10 px-1.5 py-0.5 text-xs font-medium text-error">
                        Out of stock
                      </span>
                    ) : null}
                  </div>
                  {inquiry.stock.nearestExpiry ? (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <CalendarClock className="h-4 w-4 text-gray-400" />
                      Nearest expiry {formatDate(inquiry.stock.nearestExpiry)}
                      {expiryStatus(inquiry.stock.nearestExpiry) !== 'ok' ? (
                        <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-warning-dark">
                          {expiryStatus(inquiry.stock.nearestExpiry) ===
                          'expired'
                            ? 'Expired'
                            : 'Near expiry'}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="text-xs text-gray-400">
                    {inquiry.stock.batchCount} batch
                    {inquiry.stock.batchCount === 1 ? '' : 'es'} on record
                  </p>
                </div>
              </CardContent>
            </Card>

            <p className="shrink-0 px-1 text-xs text-gray-400">
              Opened {formatDateTime(inquiry.createdAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
