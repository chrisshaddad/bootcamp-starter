'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useUser } from '@/hooks/use-auth';
import { usePatient, useSetPatientStatus } from '@/hooks/use-patients';
import { ApiError } from '@/lib/api';
import { ForbiddenPage } from '@/components/forbidden-page';
import { StatusBadge } from '@/components/status-badge';
import { ActivationStatusBadge } from '@/components/activation-status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdministrativeSection } from '@/components/patients/administrative-section';
import { ClinicalSection } from '@/components/patients/clinical-section';
import { CareTeamSection } from '@/components/patients/care-team-section';
import { RecordsSection } from '@/components/patients/records-section';

const ALLOWED_ROLES = ['INSTITUTION_ADMIN', 'STAFF', 'PROFESSIONAL', 'PATIENT'];

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const { user, isLoading: userLoading } = useUser();

  const role = user?.role;
  const canAccess = role ? ALLOWED_ROLES.includes(role) : false;

  const { patient, isLoading, error, updateAdmin, updateClinical, mutate } =
    usePatient(patientId, { enabled: canAccess });
  const { setPatientStatus } = useSetPatientStatus();

  if (userLoading || (canAccess && isLoading)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!canAccess) {
    return (
      <ForbiddenPage message="You don't have permission to view patients." />
    );
  }

  if (error || !patient) {
    return (
      <div className="py-10 text-center">
        <div className="mb-4 text-error">
          {error ? 'You cannot access this patient' : 'Patient not found'}
        </div>
        <Button variant="outline" onClick={() => router.push('/patients')}>
          Back to Patients
        </Button>
      </div>
    );
  }

  const canEditAdmin = role === 'INSTITUTION_ADMIN' || role === 'STAFF';
  const canEditClinical =
    role === 'INSTITUTION_ADMIN' || role === 'PROFESSIONAL';
  const canManageCareTeam = role === 'INSTITUTION_ADMIN' || role === 'STAFF';
  // Clinical records are only for the assigned professional and the patient —
  // institution admins and staff cannot view them.
  const canViewRecords = role === 'PROFESSIONAL' || role === 'PATIENT';
  const canAddRecords = role === 'PROFESSIONAL';

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => router.push('/patients')}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">
            {patient.fullName}
          </h1>
          <p
            className="mt-1 truncate text-sm text-muted-foreground"
            title={patient.email}
          >
            {patient.email}
          </p>
        </div>
        {canEditAdmin ? (
          <ActivationStatusBadge
            isActive={patient.isActive}
            name={patient.fullName}
            entityLabel="patient"
            onConfirm={async () => {
              try {
                await setPatientStatus(patient.id, !patient.isActive);
                mutate();
                toast.success(
                  patient.isActive
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
          <StatusBadge status={patient.isActive ? 'ACTIVE' : 'INACTIVE'} />
        )}
      </div>

      <Tabs defaultValue="clinical">
        <TabsList className="flex w-full max-w-full overflow-x-auto">
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="care-team">Care Team</TabsTrigger>
          {canViewRecords && <TabsTrigger value="records">Records</TabsTrigger>}
          <TabsTrigger value="administrative">Administrative</TabsTrigger>
        </TabsList>

        <TabsContent value="clinical">
          <ClinicalSection
            patient={patient}
            canEdit={canEditClinical}
            onSave={updateClinical}
          />
        </TabsContent>
        <TabsContent value="care-team">
          <CareTeamSection
            patient={patient}
            canManage={canManageCareTeam}
            onChange={mutate}
          />
        </TabsContent>
        {canViewRecords && (
          <TabsContent value="records">
            <RecordsSection patientId={patient.id} canAdd={canAddRecords} />
          </TabsContent>
        )}
        <TabsContent value="administrative">
          <AdministrativeSection
            patient={patient}
            canEdit={canEditAdmin}
            onSave={updateAdmin}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
