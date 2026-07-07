'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { TopNavbar } from '@/components/top-navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <TopNavbar />
        {/* Scroll the content here, not the window. A modal dialog's scroll-lock
            compensates for the *window* scrollbar; with the window never
            scrolling, opening a dialog can't shift the page sideways. */}
        {/* White, rounded scrollbar (thin track + soft grey thumb) so the page
            scroll matches the app theme instead of the default OS chrome. */}
        <main className="min-h-0 flex-1 overflow-y-auto bg-gray-50 p-6 [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-white hover:[&::-webkit-scrollbar-thumb]:bg-gray-400">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
