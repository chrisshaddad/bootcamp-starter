'use client';

import { useUser } from '@/hooks/use-auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { TopNavbar } from '@/components/top-navbar';

/** Auto-generated docstring */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated, error } = useUser();

  // Non-401 errors (e.g. 500, network) won't trigger a redirect, so show an
  // error state rather than leaving the user on an infinite spinner.
  if (!isLoading && error && error.status !== 401) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Something went wrong. Please try again.
          </p>
          <button
            className="text-sm text-blue-600 underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show spinner while the auth check is in-flight or while a redirect is pending.
  // The redirect itself is triggered by useUser (401 → /login, SUSPENDED → /suspended).
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <TopNavbar />
        <main className="flex-1 bg-gray-50 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
