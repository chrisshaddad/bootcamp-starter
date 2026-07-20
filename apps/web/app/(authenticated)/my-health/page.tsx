'use client';

import { useUser } from '@/hooks/use-auth';
import { usePatientMe } from '@/hooks/use-patients';
import { ForbiddenPage } from '@/components/forbidden-page';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdministrativeSection } from '@/components/patients/administrative-section';
import { ClinicalSection } from '@/components/patients/clinical-section';
import { CareTeamSection } from '@/components/patients/care-team-section';
import { RecordsSection } from '@/components/patients/records-section';

// Read-only view: patients can view everything, edit nothing.
const noop = async () => undefined;

export default function MyHealthPage() {
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
      <div className="py-10 text-center text-error">
        Failed to load your record
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Health</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your profile, care team, and medical records
        </p>
      </div>

      <Tabs defaultValue="clinical">
        <TabsList>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="care-team">Care Team</TabsTrigger>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="administrative">Administrative</TabsTrigger>
        </TabsList>

        <TabsContent value="clinical">
          <ClinicalSection patient={patient} canEdit={false} onSave={noop} />
        </TabsContent>
        <TabsContent value="care-team">
          <CareTeamSection
            patient={patient}
            canManage={false}
            onChange={noop}
          />
        </TabsContent>
        <TabsContent value="records">
          <RecordsSection patientId={patient.id} canAdd={false} />
        </TabsContent>
        <TabsContent value="administrative">
          <AdministrativeSection
            patient={patient}
            canEdit={false}
            onSave={noop}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
