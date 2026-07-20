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
import { LogoMark } from '@/components/logo-mark';
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
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="px-5 py-6">
        <Link href="/portal" className="flex items-center gap-2.5">
          <LogoMark />
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
                        ? 'bg-sidebar-accent text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon
                        className={cn(
                          'h-5 w-5',
                          isActive(item.url)
                            ? 'text-primary'
                            : 'text-muted-foreground',
                        )}
                      />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Account
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="rounded-lg bg-sidebar-accent px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
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
              className="h-11 gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5 text-muted-foreground" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
