'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Building2,
  UserRound,
  ClipboardList,
  GraduationCap,
  CalendarDays,
  Fingerprint,
  ScrollText,
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
  disabled?: boolean;
  roles?: string[];
}

// Navigation items for ORG_ADMIN and MEMBER roles
const orgNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Members',
    url: '/members',
    icon: UserRound,
    roles: ['ORG_ADMIN'],
  },
  {
    title: 'Schedule',
    url: '/sessions',
    icon: CalendarDays,
    roles: ['ORG_ADMIN'],
  },
  {
    title: 'Instructors',
    url: '/instructors',
    icon: GraduationCap,
    roles: ['ORG_ADMIN'],
  },
  {
    title: 'Plans',
    url: '/plans',
    icon: ClipboardList,
    roles: ['ORG_ADMIN'],
  },
  {
    title: 'Check-ins',
    url: '/checkins',
    icon: Fingerprint,
    roles: ['ORG_ADMIN'],
  },
  {
    title: 'Audit Log',
    url: '/audit-logs',
    icon: ScrollText,
    roles: ['ORG_ADMIN'],
  },
];

// Navigation items for SUPER_ADMIN role
const superAdminNavItems: NavItem[] = [
  {
    title: 'Gyms',
    url: '/gyms',
    icon: Building2,
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
    disabled: true, // Placeholder for future implementation
  },
  {
    title: 'Audit Log',
    url: '/audit-logs',
    icon: ScrollText,
  },
];

const orgSecondaryNavItems: NavItem[] = [
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
];

const superAdminSecondaryNavItems: NavItem[] = [
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
];

/**
 * Main sidebar navigation component for authenticated users
 */
export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useUser({ redirectOnUnauthenticated: false });

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const mainNavItems = isSuperAdmin
    ? superAdminNavItems
    : orgNavItems.filter(
        (item) => !item.roles || item.roles.includes(user?.role ?? ''),
      );
  const secondaryNavItems = isSuperAdmin
    ? superAdminSecondaryNavItems
    : orgSecondaryNavItems;

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(url);
  };

  const homeUrl = isSuperAdmin ? '/gyms' : '/dashboard';

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="px-5 py-6">
        {/* Logo */}
        <Link href={homeUrl} className="flex items-center gap-2.5">
          <LogoMark />
          <span className="text-xl font-semibold text-foreground">
            GymCloud
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isSuperAdmin ? 'Administration' : 'Main'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild={!item.disabled}
                    isActive={isActive(item.url)}
                    disabled={item.disabled}
                    className={cn(
                      'h-11 gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      item.disabled && 'cursor-not-allowed opacity-50',
                      isActive(item.url)
                        ? 'bg-sidebar-accent text-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
                    )}
                  >
                    {item.disabled ? (
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-muted-foreground/60" />
                        <span>{item.title}</span>
                        <span className="ml-auto text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      </div>
                    ) : (
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
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        {/* Secondary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Support
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
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
