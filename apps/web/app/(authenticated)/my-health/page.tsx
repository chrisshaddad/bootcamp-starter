'use client';

import { usePatientMe } from '@/hooks/use-patients';
import { AdministrativeSection } from '@/components/patients/administrative-section';
import { ClinicalSection } from '@/components/patients/clinical-section';

// Read-only view: patients can view everything, edit nothing.
const noop = async () => undefined;

export default function MyHealthProfilePage() {
  const { patient } = usePatientMe();

  // The layout above already gated on role/loading/error, so `patient` is
  // guaranteed here once it renders — this is just to satisfy TypeScript
  // during the brief window before the (already-cached) SWR value resolves.
  if (!patient) return null;

  return (
    <div className="flex flex-col gap-6">
      <AdministrativeSection patient={patient} canEdit={false} onSave={noop} />
      <ClinicalSection patient={patient} canEdit={false} onSave={noop} />
    </div>
  );
}
