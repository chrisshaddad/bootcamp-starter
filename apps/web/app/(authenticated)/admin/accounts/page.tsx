'use client';

import { FormEvent, useState } from 'react';
import { ShieldAlert, UserRoundCog } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminAccountResponse } from '@repo/contracts';
import {
  AdminError,
  AdminPageHeader,
  Pagination,
  StatusBadge,
} from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { useAdminAccounts } from '@/hooks/use-admin';
import { ApiError } from '@/lib/api';

export default function AdminAccountsPage() {
  const [page, setPage] = useState(1);
  const [accountType, setAccountType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminAccountResponse | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { response, isLoading, error, updateStatus } = useAdminAccounts({
    page,
    limit: 20,
    search: search || undefined,
    accountType:
      accountType === 'ALL'
        ? undefined
        : (accountType as 'DEVELOPER' | 'HIRING' | 'SUPER_ADMIN'),
    status: status === 'ALL' ? undefined : (status as 'ACTIVE' | 'SUSPENDED'),
  });

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const submitStatus = async () => {
    if (!selected || reason.trim().length < 10) return;
    setSubmitting(true);
    try {
      const nextStatus = selected.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await updateStatus(selected.id, {
        status: nextStatus,
        reason: reason.trim(),
      });
      toast.success(
        nextStatus === 'SUSPENDED'
          ? 'Account suspended'
          : 'Account reactivated',
      );
      setSelected(null);
      setReason('');
    } catch (caught) {
      toast.error(
        caught instanceof ApiError
          ? caught.message
          : 'Unable to update account',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Accounts"
        description="Track developer and hiring accounts, connections, activity, and access status."
      />
      <Card>
        <CardContent className="space-y-5 px-4 pt-6 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <form
              className="flex flex-1 flex-col gap-2 sm:flex-row"
              onSubmit={submitSearch}
            >
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search email, name, organization, or GitHub username"
                aria-label="Search accounts"
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full sm:w-auto"
              >
                Search
              </Button>
            </form>
            <Select
              value={accountType}
              onValueChange={(value) => {
                setAccountType(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All account types</SelectItem>
                <SelectItem value="DEVELOPER">Developers</SelectItem>
                <SelectItem value="HIRING">Hiring</SelectItem>
                <SelectItem value="SUPER_ADMIN">Super admins</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <AdminError message="Unable to load accounts." />
          ) : isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : !response?.data.length ? (
            <p className="text-muted-foreground py-14 text-center text-sm">
              No accounts match these filters.
            </p>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {response.data.map((account) => (
                  <article key={account.id} className="rounded-lg border p-4">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="break-words font-medium">
                          {account.displayName}
                        </div>
                        <div className="break-all text-xs text-muted-foreground">
                          {account.email}
                        </div>
                        {account.githubUsername && (
                          <div className="mt-1 break-all text-xs text-primary-base">
                            @{account.githubUsername}
                          </div>
                        )}
                      </div>
                      <StatusBadge
                        tone={
                          account.status === 'ACTIVE' ? 'success' : 'danger'
                        }
                      >
                        {account.status}
                      </StatusBadge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground">Type</div>
                        <div className="mt-1 font-medium">
                          {account.accountType.replace('_', ' ')}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Joined</div>
                        <div className="mt-1 font-medium">
                          {new Date(account.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-3 text-center text-xs">
                      <div>
                        <div className="font-semibold">
                          {account.counts.ownedProjects}
                        </div>
                        <div className="text-muted-foreground">Owned</div>
                      </div>
                      <div>
                        <div className="font-semibold">
                          {account.counts.projectMemberships}
                        </div>
                        <div className="text-muted-foreground">Teams</div>
                      </div>
                      <div>
                        <div className="font-semibold">
                          {account.counts.activeSessions}
                        </div>
                        <div className="text-muted-foreground">Sessions</div>
                      </div>
                    </div>

                    {!account.isConfirmed && (
                      <p className="mt-3 text-xs text-warning-dark">
                        Email unconfirmed
                      </p>
                    )}

                    <div className="mt-4">
                      {account.accountType === 'SUPER_ADMIN' ? (
                        <StatusBadge>Protected</StatusBadge>
                      ) : (
                        <Button
                          className="w-full"
                          size="sm"
                          variant={
                            account.status === 'ACTIVE'
                              ? 'destructive'
                              : 'outline'
                          }
                          onClick={() => setSelected(account)}
                        >
                          {account.status === 'ACTIVE'
                            ? 'Suspend'
                            : 'Reactivate'}
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {response.data.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="font-medium">
                            {account.displayName}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {account.email}
                          </div>
                          {account.githubUsername && (
                            <div className="text-primary-base text-xs">
                              @{account.githubUsername}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone="info">
                            {account.accountType.replace('_', ' ')}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <StatusBadge
                              tone={
                                account.status === 'ACTIVE'
                                  ? 'success'
                                  : 'danger'
                              }
                            >
                              {account.status}
                            </StatusBadge>
                            {!account.isConfirmed && (
                              <span className="text-warning-dark text-xs">
                                Unconfirmed
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          <div>
                            {account.counts.ownedProjects} owned projects
                          </div>
                          <div>
                            {account.counts.projectMemberships} collaborations
                          </div>
                          <div>
                            {account.counts.activeSessions} active sessions
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(account.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {account.accountType === 'SUPER_ADMIN' ? (
                            <StatusBadge>Protected</StatusBadge>
                          ) : (
                            <Button
                              size="sm"
                              variant={
                                account.status === 'ACTIVE'
                                  ? 'destructive'
                                  : 'outline'
                              }
                              onClick={() => setSelected(account)}
                            >
                              {account.status === 'ACTIVE'
                                ? 'Suspend'
                                : 'Reactivate'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          {response && (
            <Pagination
              page={response.meta.currentPage}
              totalPages={response.meta.totalPages}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
            setReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />{' '}
              {selected?.status === 'ACTIVE'
                ? 'Suspend account'
                : 'Reactivate account'}
            </DialogTitle>
            <DialogDescription>
              {selected?.status === 'ACTIVE'
                ? 'Suspension immediately revokes every active session. The action and reason are audited.'
                : 'Reactivation restores sign-in access. The user must authenticate again.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="account-action-reason">Reason</Label>
            <Textarea
              id="account-action-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Provide at least 10 characters for the audit record"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Cancel
            </Button>
            <Button
              disabled={reason.trim().length < 10 || submitting}
              variant={
                selected?.status === 'ACTIVE' ? 'destructive' : 'default'
              }
              onClick={submitStatus}
            >
              <UserRoundCog className="h-4 w-4" />{' '}
              {submitting ? 'Saving…' : 'Confirm action'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
