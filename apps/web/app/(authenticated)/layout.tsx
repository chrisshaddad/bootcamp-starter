'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { UserRole } from '@repo/contracts';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { TopNavbar } from '@/components/top-navbar';
import { useUser } from '@/hooks/use-auth';

// Roles with a restricted surface: they only see admin pages, not the
// employee-facing app. Any other role (HR/EMPLOYEE/managers) has no entry
// here and keeps full access. Kept in sync with app-sidebar.tsx's nav split.
const ROLE_ALLOWED_PREFIXES: Partial<Record<UserRole, string[]>> = {
  SUPER_ADMIN: ['/organizations', '/users'],
  ORG_ADMIN: ['/users', '/departments', '/skills', '/openings'],
};

const ROLE_HOME: Partial<Record<UserRole, string>> = {
  SUPER_ADMIN: '/organizations',
  ORG_ADMIN: '/users',
};

function isAllowed(prefixes: string[], pathname: string) {
  return prefixes.some(
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

  const allowedPrefixes = user ? ROLE_ALLOWED_PREFIXES[user.role] : undefined;
  const home = user ? ROLE_HOME[user.role] : undefined;
  const isOutOfBounds =
    !!allowedPrefixes && !isAllowed(allowedPrefixes, pathname);

  useEffect(() => {
    if (isOutOfBounds && home) {
      router.replace(home);
    }
  }, [isOutOfBounds, home, router]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopNavbar />
        <main className="flex-1 bg-canvas px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {isOutOfBounds ? null : children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
