'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { TopNavbar } from '@/components/top-navbar';
import { useUser } from '@/hooks/use-auth';

// Super Admins are platform-level admins, not employees - they only manage
// organizations/users and their own settings. Everything else here is
// employee/manager-facing (see app-sidebar.tsx's nav split) and out of
// bounds for them.
const SUPER_ADMIN_ALLOWED_PREFIXES = ['/organizations', '/users', '/settings'];

function isAllowedForSuperAdmin(pathname: string) {
  return SUPER_ADMIN_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser({ redirectOnUnauthenticated: false });

  const isOutOfBounds =
    user?.role === 'SUPER_ADMIN' && !isAllowedForSuperAdmin(pathname);

  useEffect(() => {
    if (isOutOfBounds) {
      router.replace('/organizations');
    }
  }, [isOutOfBounds, router]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopNavbar />
        <main className="flex-1 bg-gray-50 p-6">
          {isOutOfBounds ? null : children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
