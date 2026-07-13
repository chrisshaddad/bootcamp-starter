import { ComingSoon } from '@/components/coming-soon';
import { FileText } from 'lucide-react';

export default function ApplicationsPage() {
  return (
    <ComingSoon
      title="My Applications"
      description="Track the status of the opportunities you've applied to."
      icon={FileText}
    />
  );
}
