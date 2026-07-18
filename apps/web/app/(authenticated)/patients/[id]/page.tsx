'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { usePatient } from '@/hooks/use-patients';
import { ForbiddenPage } from '@/components/forbidden-page';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {patient.fullName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{patient.email}</p>
        </div>
        <StatusBadge status={patient.isActive ? 'ACTIVE' : 'INACTIVE'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdministrativeSection
          patient={patient}
          canEdit={canEditAdmin}
          onSave={updateAdmin}
        />
        <ClinicalSection
          patient={patient}
          canEdit={canEditClinical}
          onSave={updateClinical}
        />
        <CareTeamSection
          patient={patient}
          canManage={canManageCareTeam}
          onChange={mutate}
        />
        {canViewRecords && (
          <RecordsSection patientId={patient.id} canAdd={canAddRecords} />
        )}
      </div>
    </div>
  );
}
