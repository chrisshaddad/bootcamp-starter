'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Users, Plus, Search, Pencil, Trash2, Check, X } from 'lucide-react';

import { libraryMemberCreateRequestSchema } from '@repo/contracts';
import type {
  LibraryMemberCreateRequest,
  LibraryMemberResponse,
  LibraryMemberStatus,
  LibraryMembershipType,
} from '@repo/contracts';
import { useLibraryMembers } from '@/hooks/use-library-members';
import { useDebounce } from '@/hooks/use-debounce';
import { ApiError } from '@/lib/api';
import {
  MEMBER_STATUS_LABELS,
  MEMBER_STATUS_COLORS,
  MEMBERSHIP_TYPE_LABELS,
} from '@/lib/status-maps';
import { RequireRole } from '@/components/require-role';
import { StatusBadge } from '@/components/status-badge';
import { TablePagination } from '@/components/table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const PAGE_SIZE = 20;
const ALL = 'all';

const STATUS_OPTIONS: LibraryMemberStatus[] = [
  'ACTIVE',
  'EXPIRED',
  'SUSPENDED',
  'PENDING',
  'CANCELLED',
];
const TYPE_OPTIONS: LibraryMembershipType[] = ['STUDENT', 'REGULAR', 'PREMIUM'];

// membershipStartDate/EndDate coerce dates → input type diverges from output.
type MemberFormInput = z.input<typeof libraryMemberCreateRequestSchema>;

function toDateInput(value: unknown): string {
  if (!value) return '';
  const date = new Date(value as string | number | Date);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function MembersPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN', 'LIBRARIAN']}
      forbiddenMessage="Only library staff can manage members."
    >
      <MembersManager />
    </RequireRole>
  );
}

function MembersManager() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [typeFilter, setTypeFilter] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryMemberResponse | null>(null);
  const [deleting, setDeleting] = useState<LibraryMemberResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const {
    members,
    total,
    isLoading,
    error,
    create,
    update,
    approve,
    reject,
    remove,
  } = useLibraryMembers({
    page,
    search: debouncedSearch,
    limit: PAGE_SIZE,
    membershipStatus:
      statusFilter === ALL ? undefined : (statusFilter as LibraryMemberStatus),
    membershipType:
      typeFilter === ALL ? undefined : (typeFilter as LibraryMembershipType),
  });

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, typeFilter]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (member: LibraryMemberResponse) => {
    setEditing(member);
    setDialogOpen(true);
  };

  const handleApprove = async (member: LibraryMemberResponse) => {
    setApprovingId(member.id);
    try {
      await approve(member.id);
      toast.success(`Approved ${member.libraryCardNumber}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to approve member',
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (member: LibraryMemberResponse) => {
    setRejectingId(member.id);
    try {
      await reject(member.id);
      toast.success(`Rejected ${member.libraryCardNumber}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to reject member',
      );
    } finally {
      setRejectingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await remove(deleting.id);
      toast.success(`Deleted ${deleting.libraryCardNumber}`);
      setDeleting(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to delete member',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Members</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your library&apos;s patrons and approve new registrations
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search card # or name..."
              className="w-60 pl-9"
              aria-label="Search members"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {MEMBER_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {TYPE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {MEMBERSHIP_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Member
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
            {total !== undefined && (
              <span className="text-sm font-normal text-muted-foreground">
                ({total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-error">
              Failed to load members
            </div>
          ) : !members?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No members found
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Card #</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-36 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow
                      key={member.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/members/${member.id}`)}
                    >
                      <TableCell className="font-medium text-foreground">
                        {member.libraryCardNumber}
                      </TableCell>
                      <TableCell>
                        {member.user ? (
                          <div>
                            <div className="text-sm text-foreground">
                              {member.user.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {member.user.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Walk-in
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {MEMBERSHIP_TYPE_LABELS[member.membershipType] ??
                          member.membershipType}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={member.membershipStatus}
                          labels={MEMBER_STATUS_LABELS}
                          colors={MEMBER_STATUS_COLORS}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {member.membershipStatus === 'PENDING' && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Approve ${member.libraryCardNumber}`}
                                disabled={approvingId === member.id}
                                onClick={() => handleApprove(member)}
                              >
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Reject ${member.libraryCardNumber}`}
                                disabled={rejectingId === member.id}
                                onClick={() => handleReject(member)}
                              >
                                <X className="h-4 w-4 text-error" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${member.libraryCardNumber}`}
                            onClick={() => openEdit(member)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${member.libraryCardNumber}`}
                            onClick={() => setDeleting(member)}
                          >
                            <Trash2 className="h-4 w-4 text-error" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={page}
                total={total ?? 0}
                limit={PAGE_SIZE}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <MemberDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editing}
        onCreate={create}
        onUpdate={update}
      />

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete member{' '}
              <strong>{deleting?.libraryCardNumber}</strong>? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleting(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: LibraryMemberResponse | null;
  onCreate: (body: LibraryMemberCreateRequest) => Promise<unknown>;
  onUpdate: (id: string, body: LibraryMemberCreateRequest) => Promise<unknown>;
}

function MemberDialog({
  open,
  onOpenChange,
  member,
  onCreate,
  onUpdate,
}: MemberDialogProps) {
  const form = useForm<MemberFormInput, unknown, LibraryMemberCreateRequest>({
    resolver: zodResolver(libraryMemberCreateRequestSchema),
    defaultValues: {
      // undefined (not '') so the optional schema passes when left blank —
      // '' would fail .min(1) and block the auto-generation path.
      libraryCardNumber: undefined,
      membershipType: 'REGULAR',
      membershipStatus: 'ACTIVE',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      libraryCardNumber: member?.libraryCardNumber ?? undefined,
      membershipType: member?.membershipType ?? 'REGULAR',
      membershipStatus: member?.membershipStatus ?? 'ACTIVE',
      membershipStartDate: member?.membershipStartDate
        ? new Date(member.membershipStartDate)
        : undefined,
      membershipEndDate: member?.membershipEndDate
        ? new Date(member.membershipEndDate)
        : undefined,
    });
  }, [open, member, form]);

  const onSubmit = async (values: LibraryMemberCreateRequest) => {
    const payload: LibraryMemberCreateRequest = {
      // Blank ⇒ the API auto-generates a per-org card number.
      libraryCardNumber: values.libraryCardNumber?.trim() || undefined,
      membershipType: values.membershipType,
      membershipStatus: values.membershipStatus,
      membershipStartDate: values.membershipStartDate,
      membershipEndDate: values.membershipEndDate,
    };

    try {
      if (member) {
        await onUpdate(member.id, payload);
        toast.success('Member updated');
      } else {
        await onCreate(payload);
        toast.success('Member created');
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to save member',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{member ? 'Edit member' : 'New member'}</DialogTitle>
          <DialogDescription>
            {member
              ? "Update this member's details."
              : 'Register a new patron. A card number is generated automatically if you leave it blank.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="libraryCardNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Library card number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Auto-generated if left blank"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value || undefined)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="membershipType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Membership type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TYPE_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {MEMBERSHIP_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="membershipStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {MEMBER_STATUS_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="membershipStartDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={toDateInput(field.value)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="membershipEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={toDateInput(field.value)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? 'Saving...'
                  : member
                    ? 'Save changes'
                    : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
