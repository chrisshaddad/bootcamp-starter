import { ComingSoon } from '@/components/coming-soon';
import { Users } from 'lucide-react';

export default function TeamOverviewPage() {
  return (
    <ComingSoon
      title="Team Overview"
      description="See your direct reports, their skills, and mobility activity."
      icon={Users}
    />
  );
}
