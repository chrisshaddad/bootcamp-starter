'use client';

import { RoleGuard } from '@/components/auth/role-guard';

export default function BranchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allow={['PHARMACY_MANAGER', 'PHARMACY_EMPLOYEE']}>
      {children}
    </RoleGuard>
  );
}
