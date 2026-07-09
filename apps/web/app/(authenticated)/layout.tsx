'use client';

import { TopNavbar } from '@/components/top-navbar';
import { TabNav } from '@/components/tab-nav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <TabNav />
      <main className="mx-auto max-w-[1240px] px-5 py-8">{children}</main>
    </div>
  );
}
