'use client';

import { RoleGuard } from '@/components/auth/role-guard';

export default function InquiriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allow={['INQUIRY_OFFICER', 'PHARMACY_ADMIN']}>
      {children}
    </RoleGuard>
  );
}
