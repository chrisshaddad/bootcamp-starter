'use client';

import { RoleGuard } from '@/components/auth/role-guard';

export default function InquiriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // PHARMACY_EMPLOYEE is allowed in read-only — the pages hide the reply box and
  // status controls for them, and the API only opens its GET endpoints to them.
  return (
    <RoleGuard
      allow={['INQUIRY_OFFICER', 'PHARMACY_ADMIN', 'PHARMACY_EMPLOYEE']}
    >
      {children}
    </RoleGuard>
  );
}
