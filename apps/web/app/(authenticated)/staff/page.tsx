'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserCog, Plus, Search, Trash2 } from 'lucide-react';

import { staffInviteRequestSchema } from '@repo/contracts';
import type { StaffInviteRequest, StaffResponse } from '@repo/contracts';
import { useStaff } from '@/hooks/use-staff';
import { useDebounce } from '@/hooks/use-debounce';
import { ApiError } from '@/lib/api';
import { RequireRole } from '@/components/require-role';
import { StatusBadge } from '@/components/status-badge';
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

const ROLE_LABELS: Record<string, string> = {
  ORG_ADMIN: 'Admin',
  LIBRARIAN: 'Librarian',
};
const CONFIRMED_LABELS: Record<string, string> = {
  true: 'Confirmed',
  false: 'Invited',
};
const CONFIRMED_COLORS: Record<string, string> = {
  true: 'bg-success-light text-success-dark',
  false: 'bg-warning-light text-warning-dark',
};

export default function StaffPage() {
  return (
    <RequireRole
      roles={['ORG_ADMIN']}
      forbiddenMessage="Only library admins can manage staff."
    >
      <StaffManager />
    </RequireRole>
  );
}

function StaffManager() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const { staff, total, isLoading, error, invite, changeRole, remove } =
    useStaff({ search: debouncedSearch });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleting, setDeleting] = useState<StaffResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rolePending, setRolePending] = useState<string | null>(null);

  const handleRoleChange = async (member: StaffResponse, role: string) => {
    if (role === member.role) return;
    setRolePending(member.id);
    try {
      await changeRole(member.id, { role: role as StaffResponse['role'] });
      toast.success(`Role updated for ${member.email}`);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to change role',
      );
    } finally {
      setRolePending(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await remove(deleting.id);
      toast.success(`Removed ${deleting.email}`);
      setDeleting(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to remove staff member',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invite and manage the people who run your library
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email..."
              className="w-56 pl-9"
              aria-label="Search staff"
            />
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" />
            Invite Staff
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Staff
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
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="py-10 text-center text-error">
              Failed to load staff
            </div>
          ) : !staff?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No staff found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40">Role</TableHead>
                  <TableHead className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium text-foreground">
                      {member.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={String(member.isConfirmed)}
                        labels={CONFIRMED_LABELS}
                        colors={CONFIRMED_COLORS}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.role}
                        onValueChange={(role) => handleRoleChange(member, role)}
                        disabled={rolePending === member.id}
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LIBRARIAN">
                            {ROLE_LABELS.LIBRARIAN}
                          </SelectItem>
                          <SelectItem value="ORG_ADMIN">
                            {ROLE_LABELS.ORG_ADMIN}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${member.email}`}
                        onClick={() => setDeleting(member)}
                      >
                        <Trash2 className="h-4 w-4 text-error" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvite={invite}
      />

      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove staff member</DialogTitle>
            <DialogDescription>
              Remove <strong>{deleting?.email}</strong> from this library? Their
              NextShelf login stays intact — re-invite them to restore access.
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
              {isDeleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (body: StaffInviteRequest) => Promise<unknown>;
}

function InviteDialog({ open, onOpenChange, onInvite }: InviteDialogProps) {
  const form = useForm<StaffInviteRequest>({
    resolver: zodResolver(staffInviteRequestSchema),
    defaultValues: { email: '', name: '', role: 'LIBRARIAN' },
  });

  const onSubmit = async (values: StaffInviteRequest) => {
    try {
      await onInvite(values);
      toast.success(`Invitation sent to ${values.email}`);
      form.reset({ email: '', name: '', role: 'LIBRARIAN' });
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to invite staff member',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite staff</DialogTitle>
          <DialogDescription>
            They&apos;ll receive a magic sign-in link by email.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jamie Rivera" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jamie@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={field.value ?? 'LIBRARIAN'}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="LIBRARIAN">
                        {ROLE_LABELS.LIBRARIAN}
                      </SelectItem>
                      <SelectItem value="ORG_ADMIN">
                        {ROLE_LABELS.ORG_ADMIN}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                {form.formState.isSubmitting ? 'Sending...' : 'Send invite'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
