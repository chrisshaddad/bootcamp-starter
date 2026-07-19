'use client';

import { usePatientMe } from '@/hooks/use-patients';
import { CareTeamSection } from '@/components/patients/care-team-section';

const noop = async () => undefined;

export default function MyHealthCareTeamPage() {
  const { patient } = usePatientMe();

  if (!patient) return null;

  return <CareTeamSection patient={patient} canManage={false} onChange={noop} />;
}
