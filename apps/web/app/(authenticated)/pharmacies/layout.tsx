'use client';

import { RoleGuard } from '@/components/auth/role-guard';

export default function PharmaciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allow={['CLIENT']}>{children}</RoleGuard>;
}
