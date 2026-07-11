'use client';

import { RoleGuard } from '@/components/auth/role-guard';

export default function StockLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGuard allow={['STOCK_MANAGER']}>{children}</RoleGuard>;
}
