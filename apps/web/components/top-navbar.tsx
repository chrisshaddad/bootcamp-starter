'use client';

import { usePathname } from 'next/navigation';
import { LogOut, ChevronDown } from 'lucide-react';
import { useAuth, useUser } from '@/hooks/use-auth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sales',
  '/expenses': 'Expenses',
  '/products': 'Products',
  '/goals': 'Goals',
  '/imports': 'Imports',
  '/ai-insights': 'AI Insights',
  '/settings': 'Settings',
  '/organizations': 'Organizations',
};

export function TopNavbar() {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const { logout } = useAuth();
  const pathname = usePathname();

  const pageTitle =
    Object.entries(PAGE_TITLES).find(
      ([key]) => pathname === key || pathname.startsWith(key + '/'),
    )?.[1] ?? 'Margin';

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0]?.toUpperCase() ?? '?');

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:bg-secondary hover:text-foreground" />
        <span className="text-sm font-semibold text-muted-foreground">
          {pageTitle}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-secondary">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-foreground leading-tight">
                  {user?.name ?? user?.email?.split('@')[0] ?? 'User'}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {user?.role === 'SUPER_ADMIN'
                    ? 'Super Admin'
                    : user?.role === 'ORG_ADMIN'
                      ? 'Admin'
                      : 'Member'}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-48 border-border bg-popover text-popover-foreground"
          >
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-foreground">
                {user?.name ?? 'User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="flex cursor-pointer items-center gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
