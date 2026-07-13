'use client';

import { RoleGuard } from '@/components/auth/role-guard';

export default function StockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PHARMACY_ADMIN gets cross-branch oversight alongside the branch's stock
  // manager. PHARMACY_EMPLOYEE is allowed in read-only — the pages hide every
  // mutation control for them and the API only opens its GET endpoints to them.
  return (
    <RoleGuard allow={['STOCK_MANAGER', 'PHARMACY_ADMIN', 'PHARMACY_EMPLOYEE']}>
      {children}
    </RoleGuard>
  );
}
