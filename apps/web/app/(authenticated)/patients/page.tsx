'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UsersRound, Plus } from 'lucide-react';
import {
  patientCreateRequestSchema,
  type PatientCreateRequest,
} from '@repo/contracts';
import { useUser } from '@/hooks/use-auth';
import {
  usePatients,
  useCreatePatient,
  useSetPatientStatus,
} from '@/hooks/use-patients';
import { ApiError } from '@/lib/api';
import { ForbiddenPage } from '@/components/forbidden-page';
import { StatusBadge } from '@/components/status-badge';
import { ActivationStatusBadge } from '@/components/activation-status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const ALLOWED_ROLES = ['INSTITUTION_ADMIN', 'STAFF', 'PROFESSIONAL'];

function formatDate(value: string | Date | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function CreatePatientDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createPatient } = useCreatePatient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientCreateRequest>({
    resolver: zodResolver(patientCreateRequestSchema),
  });

  const onSubmit = async (data: PatientCreateRequest) => {
    setIsSubmitting(true);
    try {
      await createPatient(data);
      toast.success('Patient registered — an invitation email has been sent');
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Patient
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Patient</DialogTitle>
          <DialogDescription>
            Creates the patient account and emails them an invitation. You can
            complete the rest of their profile afterwards.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...register('fullName')} />
            {errors.fullName && (
              <p className="text-sm text-error">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-error">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-error">{errors.phone.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register('dateOfBirth')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm"
                {...register('gender')}
              >
                <option value="">—</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationalId">National ID</Label>
            <Input id="nationalId" {...register('nationalId')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PatientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: userLoading } = useUser();
  const [search, setSearch] = useState('');
  const unassignedOnly = searchParams.get('unassigned') === 'true';

  const role = user?.role;
  const canAccess = role ? ALLOWED_ROLES.includes(role) : false;
  const canCreate = role === 'INSTITUTION_ADMIN' || role === 'STAFF';
  const isProfessional = role === 'PROFESSIONAL';

  const { patients, total, isLoading, error } = usePatients({
    search: search || undefined,
    unassigned: unassignedOnly || undefined,
    enabled: canAccess,
  });
  const { setPatientStatus } = useSetPatientStatus();

  const toggleUnassignedOnly = (checked: boolean) => {
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
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-4">
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
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          {canCreate && <CreatePatientDialog />}
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
        </CardContent>
      </Card>
    </div>
  );
}
