'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-auth';
import { isProfileComplete } from '@/lib/profile';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { TopNavbar } from '@/components/top-navbar';
import { DashboardTour } from '@/components/dashboard-tour';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUser({ redirectOnUnauthenticated: true });
  const router = useRouter();
  const pathname = usePathname();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isLoading || !user) return;

    if (!isProfileComplete(user)) {
      setIsRedirecting(true);
      router.replace('/onboarding');
      return;
    }

    const hasSeenTourLocally =
      localStorage.getItem(`hasSeenDashboardTour-${user.id}`) === 'true';
    const shouldStartTourOnDashboard =
      user.accountType !== 'SUPER_ADMIN' &&
      !user.hasSeenDashboardTour &&
      !hasSeenTourLocally &&
      pathname !== '/dashboard';

    if (shouldStartTourOnDashboard) {
      setIsRedirecting(true);
      router.replace('/dashboard');
      return;
    }

    setIsRedirecting(false);
  }, [user, isLoading, pathname, router]);

  if (isLoading || isRedirecting || (user && !isProfileComplete(user))) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <AppSidebar />
      <SidebarInset className="h-svh min-h-0 overflow-hidden">
        <TopNavbar />
        <main className="min-h-0 flex-1 overflow-y-auto bg-background p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>

      {user?.accountType !== 'SUPER_ADMIN' && <DashboardTour />}
    </SidebarProvider>
  );
}
