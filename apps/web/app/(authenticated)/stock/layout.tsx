'use client';

import { RoleGuard } from '@/components/auth/role-guard';

export default function StockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PHARMACY_ADMIN gets cross-branch oversight alongside the branch's stock manager.
  return (
    <RoleGuard allow={['STOCK_MANAGER', 'PHARMACY_ADMIN']}>
      {children}
    </RoleGuard>
  );
}
