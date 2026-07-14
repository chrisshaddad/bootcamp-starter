'use client';

import { useUser } from '@/hooks/use-auth';
import { ProfilePage } from '@/components/profile/profile-page';

// Personal profile for pharmacy users (admin, manager, employee, stock manager,
// inquiry officer) — identity only, no location. Clients share this page but
// get the location map too: it's the origin their "nearest pharmacies" reads.
export default function ProfilePageRoute() {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  return <ProfilePage includeLocation={user?.role === 'CLIENT'} />;
}
