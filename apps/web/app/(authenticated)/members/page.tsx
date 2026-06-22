'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Users, Plus, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  memberCreateRequestSchema,
  type MemberCreateRequest,
  type MemberStatus,
} from '@repo/contracts';
import { useMembers, useCreateMember } from '@/hooks/use-members';
import { ApiError } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | MemberStatus;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-primary-100 text-primary-base',
  INACTIVE: 'bg-gray-200 text-gray-700',
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-200 text-gray-700'}`}
    >
      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function MembersPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dobMonth, setDobMonth] = useState(new Date(2000, 0));

  const { members, total, isLoading, error } = useMembers({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const { create } = useCreateMember();

  const form = useForm<MemberCreateRequest>({
    resolver: zodResolver(memberCreateRequestSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: undefined,
    },
  });

  const handleAdd = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      const payload: MemberCreateRequest = {
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber!,
        ...(data.dateOfBirth
          ? { dateOfBirth: new Date(data.dateOfBirth).toISOString() }
          : {}),
      };
      const member = await create(payload);
      toast.success('Member added successfully');
      setShowAddDialog(false);
      form.reset();
      router.push(`/members/${member.id}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to add member',
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your gym members</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INACTIVE">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Button
            className="gap-2 bg-primary-base hover:bg-primary-400 text-white"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
            {total !== undefined && (
              <span className="text-sm font-normal text-gray-500">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="py-10 text-center text-error">
              Failed to load members
            </div>
          ) : !members?.length ? (
            <div className="py-10 text-center text-gray-500">
              No members found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow
                    key={member.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/members/${member.id}`)}
                  >
                    <TableCell className="font-medium text-gray-900">
                      {member.name}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {member.email}
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {member.phoneNumber}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={member.status} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) form.reset();
          if (open) setDobMonth(new Date(2000, 0));
        }}
      >
        <DialogContent>
          <form onSubmit={handleAdd}>
            <DialogHeader>
              <DialogTitle>Add Member</DialogTitle>
              <DialogDescription>
                Create a new member for your gym. You can invite them to the
                member portal later.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label htmlFor="name">
                  Full Name <span className="text-error">*</span>
                </Label>
                <Input
                  id="name"
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
                <Label htmlFor="email">
                  Email <span className="text-error">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jane@example.com"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-error">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="phoneNumber">
                  Phone Number <span className="text-error">*</span>
                </Label>
                <Input
                  id="phoneNumber"
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
                  setShowAddDialog(false);
                  form.reset();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary-base hover:bg-primary-400 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Member'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
