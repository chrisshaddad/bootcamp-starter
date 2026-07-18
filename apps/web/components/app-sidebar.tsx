'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  UsersRound,
  Stethoscope,
  HeartPulse,
  Building2,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react';
import type { Role } from '@repo/contracts';
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

// Main navigation per role. Backend guards remain the real enforcement — this
// just hides items a role can't use. Settings is shared (see below).
const NAV_ITEMS_BY_ROLE: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { title: 'Institutions', url: '/institutions', icon: Building2 },
  ],
  INSTITUTION_ADMIN: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Patients', url: '/patients', icon: UsersRound },
    { title: 'Staff & Doctors', url: '/users', icon: Users },
    { title: 'My Institution', url: '/institution', icon: Building2 },
    { title: 'Notifications', url: '/notifications', icon: Bell },
  ],
  STAFF: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'Patients', url: '/patients', icon: UsersRound },
    { title: 'Notifications', url: '/notifications', icon: Bell },
  ],
  PROFESSIONAL: [
    { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
    { title: 'My Patients', url: '/patients', icon: Stethoscope },
    { title: 'Notifications', url: '/notifications', icon: Bell },
  ],
  PATIENT: [
    { title: 'My Health', url: '/portal', icon: HeartPulse },
    { title: 'Notifications', url: '/notifications', icon: Bell },
  ],
};

const SECONDARY_NAV_ITEMS: NavItem[] = [
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useUser({ redirectOnUnauthenticated: false });

  const role = user?.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const mainNavItems = role ? NAV_ITEMS_BY_ROLE[role] : [];

  const isActive = (url: string) => {
    if (url === '/dashboard' || url === '/portal') {
      return pathname === url;
    }
    return pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-5 py-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-base">
            <HeartPulse className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-semibold text-sidebar-foreground">
            MediLink
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
            {isSuperAdmin ? 'Administration' : 'Main'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={cn(
                      'h-11 gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      isActive(item.url)
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5 text-sidebar-foreground/60" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        {/* Secondary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
            Support
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECONDARY_NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className={cn(
                      'h-11 gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      isActive(item.url)
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5 text-sidebar-foreground/60" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => logout()}
              className="h-11 gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-error-light hover:text-error"
            >
              <LogOut className="h-5 w-5 text-sidebar-foreground/60" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
