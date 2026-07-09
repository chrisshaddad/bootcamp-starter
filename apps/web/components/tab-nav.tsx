'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface TabItem {
  title: string;
  url: string;
}

const TABS_BY_ROLE: Record<string, TabItem[]> = {
  SUPER_ADMIN: [
    { title: 'Organizations', url: '/organizations' },
    { title: 'Settings', url: '/settings' },
  ],
  ORG_ADMIN: [
    { title: 'Overview', url: '/dashboard' },
    { title: 'Users', url: '/users' },
    { title: 'Settings', url: '/settings' },
  ],
  RECEPTIONIST: [
    { title: 'Create User', url: '/users' },
    { title: 'Settings', url: '/settings' },
  ],
  MEMBER: [
    { title: 'Overview', url: '/dashboard' },
    { title: 'Settings', url: '/settings' },
  ],
};

export function TabNav() {
  const pathname = usePathname();
  const { user } = useUser({ redirectOnUnauthenticated: false });

  const tabs = user?.role
    ? (TABS_BY_ROLE[user.role] ?? TABS_BY_ROLE.MEMBER!)
    : TABS_BY_ROLE.MEMBER!;

  const isActive = (url: string) =>
    url === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(url);

  return (
    <nav className="flex gap-1 border-b border-border bg-surface px-3.5">
      {tabs.map((tab) => (
        <Link
          key={tab.url}
          href={tab.url}
          className={cn(
            '-mb-px border-b-2 px-3 py-3 text-[13px] font-semibold transition-colors',
            isActive(tab.url)
              ? 'border-amber text-text-1'
              : 'border-transparent text-text-2 hover:text-text-1',
          )}
        >
          {tab.title}
        </Link>
      ))}
    </nav>
  );
}
