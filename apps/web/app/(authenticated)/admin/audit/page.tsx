'use client';

import { useAuditLogs } from '@/hooks/use-audit';
import { AuditConsole } from '@/components/audit/audit-console';

export default function AuditPage() {
  const { logs, total, isLoading, error, mutate } = useAuditLogs();

  return (
    <AuditConsole
      logs={logs}
      total={total}
      isLoading={isLoading}
      error={error}
      mutate={mutate}
      title="Audit Logs"
      description="A plain-language history of platform activity. Click any entry to see what changed and the full technical record."
    />
  );
}
