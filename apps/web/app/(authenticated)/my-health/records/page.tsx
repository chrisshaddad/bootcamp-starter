'use client';

import { usePatientMe } from '@/hooks/use-patients';
import { RecordsSection } from '@/components/patients/records-section';

export default function MyHealthRecordsPage() {
  const { patient } = usePatientMe();

  if (!patient) return null;

  return <RecordsSection patientId={patient.id} canAdd={false} />;
}
