'use client';

import { usePharmacyAuditLogs } from '@/hooks/use-pharmacy-audit';
import { AuditConsole } from '@/components/audit/audit-console';

export default function PharmacyAuditPage() {
  const { logs, total, isLoading, error, mutate } = usePharmacyAuditLogs();

  return (
    <AuditConsole
      logs={logs}
      total={total}
      isLoading={isLoading}
      error={error}
      mutate={mutate}
      title="Audit Logs"
      description="A plain-language history of your pharmacy's activity. Click any entry to see what changed and the full technical record."
    />
  );
}
