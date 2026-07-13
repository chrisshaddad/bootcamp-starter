import { ComingSoon } from '@/components/coming-soon';
import { FolderKanban } from 'lucide-react';

export default function ManageOpeningsPage() {
  return (
    <ComingSoon
      title="Manage Openings"
      description="Create and manage the opportunities your team is hiring for."
      icon={FolderKanban}
    />
  );
}
