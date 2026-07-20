'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  ClipboardList,
  Calendar,
  User,
  LogOut,
} from 'lucide-react';
import { useAuth, useUser } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const portalNavItems: NavItem[] = [
  { title: 'Home', url: '/portal', icon: LayoutDashboard },
  { title: 'My Bookings', url: '/portal/bookings', icon: Calendar },
  {
    title: 'My Subscriptions',
    url: '/portal/subscriptions',
    icon: ClipboardList,
  },
  { title: 'Available Plans', url: '/portal/plans', icon: ClipboardList },
  { title: 'My Profile', url: '/portal/profile', icon: User },
];

export function MemberSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useUser({ redirectOnUnauthenticated: false });

  const isActive = (url: string) => {
    if (url === '/portal') {
      return pathname === '/portal';
    }
    return pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-r border-border bg-card">
      <SidebarHeader className="px-5 py-6">
        <Link href="/portal" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-base shadow-2xs">
            <span className="text-lg font-bold text-white">✦</span>
          </div>
          <span className="text-xl font-semibold text-foreground">
            Member Portal
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            My Gym
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {portalNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={cn(
                      'h-11 gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      isActive(item.url)
                        ? 'bg-primary-base/10 text-primary-base dark:bg-primary-base/20 dark:text-primary-300 font-semibold'
                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4 border-border/60" />

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Account
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {user.email}
                </p>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => logout()}
              className="h-11 gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-error/10 hover:text-error"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
