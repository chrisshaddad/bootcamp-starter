'use client';

import { useUser } from '@/hooks/use-auth';
import { usePatientMe } from '@/hooks/use-patients';
import { ForbiddenPage } from '@/components/forbidden-page';
import { Skeleton } from '@/components/ui/skeleton';
import { AdministrativeSection } from '@/components/patients/administrative-section';
import { ClinicalSection } from '@/components/patients/clinical-section';
import { CareTeamSection } from '@/components/patients/care-team-section';
import { RecordsSection } from '@/components/patients/records-section';

// Read-only view: patients can view everything, edit nothing.
const noop = async () => undefined;

export default function PortalPage() {
  const { user, isLoading: userLoading } = useUser();
  const isPatient = user?.role === 'PATIENT';

  const { patient, isLoading, error } = usePatientMe({ enabled: isPatient });

  if (userLoading || (isPatient && isLoading)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isPatient) {
    return (
      <ForbiddenPage message="The patient portal is only available to patients." />
    );
  }

  if (error || !patient) {
    return (
      <div className="py-10 text-center text-red-500">
        Failed to load your record
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Health</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your profile, care team, and medical records
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdministrativeSection patient={patient} canEdit={false} onSave={noop} />
        <ClinicalSection patient={patient} canEdit={false} onSave={noop} />
        <CareTeamSection patient={patient} canManage={false} onChange={noop} />
        <RecordsSection patientId={patient.id} canAdd={false} />
      </div>
    </div>
  );
}
