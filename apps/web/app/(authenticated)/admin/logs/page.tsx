'use client';

import { FormEvent, useState } from 'react';
import { FileClock } from 'lucide-react';
import {
  AdminError,
  AdminPageHeader,
  Pagination,
  StatusBadge,
} from '@/components/admin/admin-ui';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { useAdminAuditLogs } from '@/hooks/use-admin';

const ACTION_LABELS: Record<string, string> = {
  ACCOUNT_SUSPENDED: 'Account suspended',
  ACCOUNT_REACTIVATED: 'Account reactivated',
  PROJECT_ARCHIVED: 'Project archived',
  PROJECT_SUSPENDED: 'Project suspended',
  PROJECT_RESTORED: 'Project restored',
};

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('ALL');
  const [targetType, setTargetType] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { response, isLoading, error } = useAdminAuditLogs({
    page,
    limit: 20,
    search: search || undefined,
    action:
      action === 'ALL'
        ? undefined
        : (action as
            | 'ACCOUNT_SUSPENDED'
            | 'ACCOUNT_REACTIVATED'
            | 'PROJECT_ARCHIVED'
            | 'PROJECT_SUSPENDED'
            | 'PROJECT_RESTORED'),
    targetType:
      targetType === 'ALL' ? undefined : (targetType as 'USER' | 'PROJECT'),
  });

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit logs"
        description="Immutable records of sensitive administrative actions. Secrets and raw server output are intentionally excluded."
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
                placeholder="Search target ID, administrator email, or reason"
                aria-label="Search audit logs"
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
              value={action}
              onValueChange={(value) => {
                setAction(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All actions</SelectItem>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={targetType}
              onValueChange={(value) => {
                setTargetType(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All targets</SelectItem>
                <SelectItem value="USER">Accounts</SelectItem>
                <SelectItem value="PROJECT">Projects</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <AdminError message="Unable to load audit logs." />
          ) : isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : !response?.data.length ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 py-14 text-center text-sm">
              <FileClock className="h-9 w-9" />
              No administrative actions match these filters.
            </div>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {response.data.map((log) => (
                  <article key={log.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {ACTION_LABELS[log.action]}
                      </span>
                      <StatusBadge tone="info">{log.targetType}</StatusBadge>
                    </div>

                    <div className="mt-4 min-w-0 text-sm">
                      <div className="text-xs text-muted-foreground">
                        Administrator
                      </div>
                      <div className="mt-1 break-words font-medium">
                        {log.actor?.displayName ?? 'Deleted administrator'}
                      </div>
                      <div className="break-all text-xs text-muted-foreground">
                        {log.actor?.email ?? 'Actor retained by ID only'}
                      </div>
                    </div>

                    <div className="mt-4 min-w-0">
                      <div className="text-xs text-muted-foreground">
                        Target ID
                      </div>
                      <div className="mt-1 break-all font-mono text-[11px]">
                        {log.targetId}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-xs text-muted-foreground">
                        Reason
                      </div>
                      <p className="mt-1 break-words text-sm">
                        {log.reason ?? '—'}
                      </p>
                    </div>

                    <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </article>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Administrator</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {response.data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {ACTION_LABELS[log.action]}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {log.actor?.displayName ?? 'Deleted administrator'}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {log.actor?.email ?? 'Actor retained by ID only'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone="info">
                            {log.targetType}
                          </StatusBadge>
                          <div className="text-muted-foreground mt-1 font-mono text-[11px]">
                            {log.targetId}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-80">
                          <p className="line-clamp-2 text-sm">
                            {log.reason ?? '—'}
                          </p>
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                          {new Date(log.createdAt).toLocaleString()}
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
    </div>
  );
}
