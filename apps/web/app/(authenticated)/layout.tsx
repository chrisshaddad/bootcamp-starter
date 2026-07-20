'use client';

import type { CSSProperties, ReactNode } from 'react';

import { AppSidebar } from '@/components/app-sidebar';
import { TopNavbar } from '@/components/top-navbar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

interface AuthenticatedLayoutProps {
  children: ReactNode;
}

export default function AuthenticatedLayout({
  children,
}: AuthenticatedLayoutProps) {
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '15rem',
          '--sidebar-width-icon': '3.25rem',
        } as CSSProperties
      }
    >
      <AppSidebar />

      <SidebarInset className="min-w-0 bg-[#f7f8fc]">
        <TopNavbar />

        <main className="flex-1 bg-[#f7f8fc] px-4 py-5 sm:px-5 lg:px-6">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>

        <footer className="border-t border-[#e2e5ed] bg-[#f7f8fc] px-6 py-4 text-center text-[10px] text-[#8a93a7]">
          © {new Date().getFullYear()} Bootcamp Starter Administration. All
          rights reserved.
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
