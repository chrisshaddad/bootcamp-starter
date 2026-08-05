'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/use-auth';
import { isProfileComplete } from '@/lib/profile';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { TopNavbar } from '@/components/top-navbar';
import { DashboardTour } from '@/components/dashboard-tour'; // <-- Import it here
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUser({ redirectOnUnauthenticated: true });
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      if (!isProfileComplete(user)) {
        setIsRedirecting(true);
        router.replace('/onboarding');
      }
    }
  }, [user, isLoading, router]);

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
        <main className="bg-background min-h-0 flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </SidebarInset>

      {/* Render the Tour Overlay */}
      <DashboardTour />
    </SidebarProvider>
  );
}
