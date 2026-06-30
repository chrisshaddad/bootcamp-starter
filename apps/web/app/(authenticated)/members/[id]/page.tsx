'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  CalendarDays,
  CalendarIcon,
  Edit2,
  UserX,
  UserCheck,
  Send,
} from 'lucide-react';
import {
  memberUpdateRequestSchema,
  type MemberUpdateRequest,
} from '@repo/contracts';
import { useMember } from '@/hooks/use-members';
import { SubscriptionsPanel } from './subscriptions-panel';
import { ApiError, apiPost } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-primary-100 text-primary-base border-primary-200',
  INACTIVE: 'bg-gray-200 text-gray-700 border-gray-300',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${STATUS_COLORS[status] ?? 'bg-gray-200 text-gray-700'}`}
    >
      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
    </span>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const { member, isLoading, error, update, mutate } = useMember(memberId);

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [dobMonth, setDobMonth] = useState(new Date(2000, 0));

  const form = useForm<MemberUpdateRequest>({
    resolver: zodResolver(memberUpdateRequestSchema),
    mode: 'onTouched',
  });

  const openEdit = () => {
    if (!member) return;
    const dob = member.dateOfBirth ? new Date(member.dateOfBirth) : undefined;
    form.reset({
      name: member.name,
      phoneNumber: member.phoneNumber ?? '',
      dateOfBirth: dob
        ? new Date(
            Date.UTC(dob.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()),
          ).toISOString()
        : undefined,
    });
    setDobMonth(
      dob
        ? new Date(dob.getUTCFullYear(), dob.getUTCMonth(), 1)
        : new Date(2000, 0),
    );
    setShowEditDialog(true);
  };

  const handleEdit = form.handleSubmit(async (data) => {
    if (!member) return;
    setIsUpdating(true);
    try {
      const payload: MemberUpdateRequest = {};

      if (data.name && data.name !== member.name) {
        payload.name = data.name;
      }

      const newPhone = data.phoneNumber?.trim() || undefined;
      if (newPhone !== member.phoneNumber) {
        payload.phoneNumber = newPhone;
      }

      const toDayStr = (v: string | Date | null | undefined) =>
        v ? new Date(v).toISOString().slice(0, 10) : null;
      if (toDayStr(data.dateOfBirth) !== toDayStr(member.dateOfBirth)) {
        payload.dateOfBirth = data.dateOfBirth ?? null;
      }

      if (Object.keys(payload).length === 0) {
        toast.info('No changes to save');
        setShowEditDialog(false);
        return;
      }

      await update(payload);
      toast.success('Member updated');
      setShowEditDialog(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update member',
      );
    } finally {
      setIsUpdating(false);
    }
  });

  const handleInvite = async () => {
    if (!member) return;
    setIsInviting(true);
    try {
      await apiPost(`/members/${memberId}/invite`);
      toast.success(
        "Portal invite sent — check the member's email for a login link",
      );
      setShowInviteDialog(false);
      mutate();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to send invite',
      );
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!member) return;
    setIsTogglingStatus(true);
    try {
      const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await update({ status: newStatus });
      toast.success(
        newStatus === 'INACTIVE' ? 'Member deactivated' : 'Member reactivated',
      );
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to update status',
      );
    } finally {
      setIsTogglingStatus(false);
    }
  };

  if (isLoading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="py-10 text-center">
        <div className="mb-4 text-error">Failed to load member</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="py-10 text-center">
        <div className="mb-4 text-gray-500">Member not found</div>
        <Button variant="outline" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  const isActive = member.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => router.push('/members')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Members
      </Button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
          <div className="mt-2">
            <StatusBadge status={member.status} />
          </div>
        </div>

        <div className="flex gap-3">
          {!member.userId && isActive && (
            <Button
              variant="outline"
              className="gap-2 border-primary-200 text-primary-base hover:bg-primary-100"
              onClick={() => setShowInviteDialog(true)}
              disabled={isInviting}
            >
              <Send className="h-4 w-4" />
              Invite to Portal
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={openEdit}>
            <Edit2 className="h-4 w-4" />
            Edit
          </Button>
          {isActive ? (
            <Button
              variant="outline"
              className="gap-2 border-error/30 text-error hover:bg-error-light"
              onClick={() => setShowConfirmDialog(true)}
              disabled={isTogglingStatus}
            >
              <UserX className="h-4 w-4" />
              Deactivate
            </Button>
          ) : (
            <Button
              className="gap-2 bg-primary-base hover:bg-primary-400 text-white"
              onClick={() => setShowConfirmDialog(true)}
              disabled={isTogglingStatus}
            >
              <UserCheck className="h-4 w-4" />
              Reactivate
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Member Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <InfoRow icon={Mail} label="Email" value={member.email} />
            <InfoRow
              icon={Phone}
              label="Phone"
              value={
                member.phoneNumber ?? (
                  <span className="text-gray-400">Not provided</span>
                )
              }
            />
            <InfoRow
              icon={CalendarDays}
              label="Date of Birth"
              value={
                member.dateOfBirth ? (
                  new Date(member.dateOfBirth).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                ) : (
                  <span className="text-gray-400">Not provided</span>
                )
              }
            />
            <InfoRow
              icon={CalendarDays}
              label="Joined"
              value={new Date(member.joinedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Portal Access
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {member.userId ? (
              <div className="rounded-lg bg-primary-100 p-4">
                <div className="text-sm font-medium text-primary-base">
                  Portal access active
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  This member has been invited and can log in to the member
                  portal.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="text-sm font-medium text-gray-700">
                    No portal access yet
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Send an invite so this member can log in and view their
                    subscriptions.
                  </p>
                </div>
                {isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-primary-200 text-primary-base hover:bg-primary-100"
                    onClick={() => setShowInviteDialog(true)}
                    disabled={isInviting}
                  >
                    <Send className="h-4 w-4" />
                    Send Portal Invite
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SubscriptionsPanel memberId={memberId} />

      <Dialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Member</DialogTitle>
              <DialogDescription>
                Update the member&apos;s details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  placeholder="Jane Doe"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-error">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  type="tel"
                  placeholder="e.g. +1 555 000 1234"
                  aria-invalid={!!form.formState.errors.phoneNumber}
                  {...form.register('phoneNumber')}
                />
                {form.formState.errors.phoneNumber && (
                  <p className="text-xs text-error">
                    {form.formState.errors.phoneNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Date of Birth</Label>
                <Controller
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => {
                    const parts = field.value
                      ?.slice(0, 10)
                      .split('-')
                      .map(Number);
                    const selected = parts
                      ? new Date(parts[0]!, parts[1]! - 1, parts[2]!)
                      : undefined;
                    const toUTCMidnight = (d: Date) =>
                      new Date(
                        Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()),
                      ).toISOString();
                    return (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              'w-full justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground',
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selected ? format(selected, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selected}
                            month={dobMonth}
                            onMonthChange={(newMonth) => {
                              setDobMonth(newMonth);
                              if (selected) {
                                const maxDay = new Date(
                                  newMonth.getFullYear(),
                                  newMonth.getMonth() + 1,
                                  0,
                                ).getDate();
                                if (selected.getDate() > maxDay) {
                                  field.onChange(
                                    toUTCMidnight(
                                      new Date(
                                        newMonth.getFullYear(),
                                        newMonth.getMonth(),
                                        maxDay,
                                      ),
                                    ),
                                  );
                                }
                              }
                            }}
                            onSelect={(date) => {
                              if (date) {
                                field.onChange(toUTCMidnight(date));
                                setDobMonth(date);
                              } else {
                                field.onChange(undefined);
                              }
                            }}
                            captionLayout="dropdown"
                            startMonth={new Date(1920, 0)}
                            endMonth={
                              new Date(new Date().getFullYear() - 5, 11)
                            }
                          />
                        </PopoverContent>
                      </Popover>
                    );
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  form.reset();
                }}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary-base hover:bg-primary-400 text-white"
                disabled={isUpdating}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to Member Portal</DialogTitle>
            <DialogDescription>
              A magic-link login email will be sent to{' '}
              <span className="font-medium text-gray-900">{member.email}</span>.
              The member will be able to log in and view their subscriptions and
              available plans.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              className="gap-2 bg-primary-base hover:bg-primary-400 text-white"
              onClick={handleInvite}
              disabled={isInviting}
            >
              <Send className="h-4 w-4" />
              {isInviting ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isActive ? 'Deactivate Member' : 'Reactivate Member'}
            </DialogTitle>
            <DialogDescription>
              {isActive
                ? `Are you sure you want to deactivate ${member.name}? They will no longer have active membership.`
                : `Are you sure you want to reactivate ${member.name}? They will regain active membership.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isTogglingStatus}
            >
              Cancel
            </Button>
            <Button
              className={
                isActive
                  ? 'bg-error hover:bg-error/90 text-white'
                  : 'bg-primary-base hover:bg-primary-400 text-white'
              }
              onClick={async () => {
                setShowConfirmDialog(false);
                await handleToggleStatus();
              }}
              disabled={isTogglingStatus}
            >
              {isTogglingStatus
                ? isActive
                  ? 'Deactivating...'
                  : 'Reactivating...'
                : isActive
                  ? 'Deactivate'
                  : 'Reactivate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
