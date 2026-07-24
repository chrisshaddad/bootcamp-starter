'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { UsersRound } from 'lucide-react';
import { DEFAULT_PAGE_SIZE } from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import { usePatients, useSetPatientStatus } from '@/hooks/use-patients';
import { ApiError } from '@/lib/api';
import { ForbiddenPage } from '@/components/forbidden-page';
import { StatusBadge } from '@/components/status-badge';
import { ActivationStatusBadge } from '@/components/activation-status-badge';
import { CreatePatientDialog } from '@/components/patients/create-patient-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination } from '@/components/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const ALLOWED_ROLES = ['INSTITUTION_ADMIN', 'STAFF', 'PROFESSIONAL'];

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function PatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const unassignedOnly = searchParams.get('unassigned') === 'true';

  const role = user?.role;
  const canAccess = role ? ALLOWED_ROLES.includes(role) : false;
  const canCreate = role === 'INSTITUTION_ADMIN' || role === 'STAFF';
  const isProfessional = role === 'PROFESSIONAL';

  const { patients, total, isLoading, error } = usePatients({
    search: search || undefined,
    unassigned: unassignedOnly || undefined,
    page,
    limit: pageSize,
    enabled: canAccess,
  });
  const { setPatientStatus } = useSetPatientStatus();

  // Clamp back to the last valid page if a filter/pageSize change or a
  // background revalidation shrinks `total` out from under the current page.
  useEffect(() => {
    if (total === undefined) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [total, pageSize, page]);

  const toggleUnassignedOnly = (checked: boolean) => {
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set('unassigned', 'true');
    } else {
      params.delete('unassigned');
    }
    const qs = params.toString();
    router.replace(qs ? `/patients?${qs}` : '/patients', { scroll: false });
  };

  if (userLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!canAccess) {
    return (
      <ForbiddenPage message="You don't have permission to view patients." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isProfessional ? 'My Patients' : 'Patients'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isProfessional
              ? 'Patients assigned to your care'
              : 'Manage patient records and care teams'}
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
          {!isProfessional && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="unassigned-filter"
                checked={unassignedOnly}
                onCheckedChange={(checked) =>
                  toggleUnassignedOnly(checked === true)
                }
              />
              <Label
                htmlFor="unassigned-filter"
                className="text-sm font-normal text-foreground"
              >
                No care team
              </Label>
            </div>
          )}
          <Input
            placeholder="Search patients..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-56"
          />
          {canCreate && (
            <CreatePatientDialog
              canEditClinical={role === 'INSTITUTION_ADMIN'}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="h-5 w-5" />
            Patients
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
              Failed to load patients
            </div>
          ) : !patients?.length ? (
            <div className="py-10 text-center text-muted-foreground">
              No patients found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>National ID</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow
                    key={p.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/patients/${p.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {p.fullName}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {p.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.nationalId || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(p.dateOfBirth)}
                    </TableCell>
                    <TableCell>
                      {canCreate ? (
                        <ActivationStatusBadge
                          isActive={p.isActive}
                          name={p.fullName}
                          entityLabel="patient"
                          onConfirm={async () => {
                            try {
                              await setPatientStatus(p.id, !p.isActive);
                              toast.success(
                                p.isActive
                                  ? 'Patient deactivated'
                                  : 'Patient reactivated',
                              );
                            } catch (error) {
                              toast.error(
                                error instanceof ApiError
                                  ? error.message
                                  : 'Failed to update status',
                              );
                              throw error;
                            }
                          }}
                        />
                      ) : (
                        <StatusBadge
                          status={p.isActive ? 'ACTIVE' : 'INACTIVE'}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {total !== undefined && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
