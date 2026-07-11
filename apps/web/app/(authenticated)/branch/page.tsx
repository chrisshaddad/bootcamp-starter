import { LayoutDashboard } from 'lucide-react';
import { PanelPlaceholder } from '@/components/panel-placeholder';

export default function BranchDashboardPage() {
  return (
    <PanelPlaceholder
      icon={LayoutDashboard}
      title="Branch dashboard"
      description="Low-stock alerts, near-expiry warnings, and open inquiries for your branch. This panel is being built."
    />
  );
}
