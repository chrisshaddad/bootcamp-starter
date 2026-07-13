'use client';

import { ProfilePage } from '@/components/profile/profile-page';

// The super admin manages the platform's location-aware profile (map + coords).
export default function AdminProfilePage() {
  return <ProfilePage includeLocation />;
}
