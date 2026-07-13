'use client';

import { ProfilePage } from '@/components/profile/profile-page';

// Personal profile for pharmacy users (admin, manager, employee, stock manager,
// inquiry officer). No location/map — just account identity + personal details.
export default function ProfilePageRoute() {
  return <ProfilePage />;
}
