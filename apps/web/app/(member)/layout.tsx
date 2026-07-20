'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-auth';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { MemberSidebar } from '@/components/member-sidebar';
import { TopNavbar } from '@/components/top-navbar';
import { ThemeProvider } from '@/components/theme-provider';

import { PageTransition } from '@/components/page-transition';
import { ChatWidget } from '@/components/chat-widget';

export default function MemberPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isLoading, isAuthenticated, error, user, mutate } = useUser();

  // Re-validate auth on every navigation so deactivation is detected immediately
  // without waiting for a hard refresh.
  useEffect(() => {
    mutate();
  }, [pathname, mutate]);

  if (!isLoading && error && error.status !== 401) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Something went wrong. Please try again.
          </p>
          <button
            className="text-sm text-primary underline"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
      </div>
    );
  }

  // Deactivated members land on /portal/deactivated — render without sidebar
  // so the page is full-screen (matching the /suspended pattern).
  if (user?.memberStatus === 'INACTIVE') {
    return (
      <>
        <ThemeProvider />
        {children}
        <ChatWidget />
      </>
    );
  }

  return (
    <SidebarProvider>
      <ThemeProvider />
      <MemberSidebar />
      <SidebarInset>
        <TopNavbar />
        <main className="flex-1 bg-background p-6">
          <PageTransition>{children}</PageTransition>
        </main>
      </SidebarInset>
      <ChatWidget />
    </SidebarProvider>
  );
}
