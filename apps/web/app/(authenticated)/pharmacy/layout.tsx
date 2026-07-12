'use client';

import { RoleGuard } from '@/components/auth/role-guard';

export default function PharmacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allow={['PHARMACY_ADMIN']}>{children}</RoleGuard>;
}
