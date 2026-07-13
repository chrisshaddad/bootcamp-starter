import { ComingSoon } from '@/components/coming-soon';
import { User } from 'lucide-react';

export default function ProfilePage() {
  return (
    <ComingSoon
      title="My Profile"
      description="Manage your skills, experience, and personal details."
      icon={User}
    />
  );
}
