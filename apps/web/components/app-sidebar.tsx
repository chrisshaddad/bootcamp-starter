'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Settings,
  Building2,
  UserCog,
  FolderGit2,
  Compass, // <-- 1. Import Compass here
} from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
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
}

// Navigation items for ORG_ADMIN and MEMBER roles
const orgNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Explore', // <-- 2. Added Explore for normal users
    url: '/explore',
    icon: Compass,
  },
  {
    title: 'Projects',
    url: '/projects',
    icon: FolderGit2,
  },
  {
    title: 'Profile',
    url: '/profile',
    icon: UserCog,
  },
];

// Navigation items for SUPER_ADMIN role
const superAdminNavItems: NavItem[] = [
  {
    title: 'Organizations',
    url: '/organizations',
    icon: Building2,
  },
  {
    title: 'Explore', // <-- 3. Fixed title and icon for super admins
    url: '/explore',
    icon: Compass,
  },
  {
    title: 'Projects',
    url: '/projects',
    icon: FolderGit2,
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
    disabled: true, // Placeholder for future implementation
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

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser({ redirectOnUnauthenticated: false });

  const isSuperAdmin = user?.accountType === 'SUPER_ADMIN';
  const mainNavItems = isSuperAdmin ? superAdminNavItems : orgNavItems;
  const secondaryNavItems = isSuperAdmin
    ? superAdminSecondaryNavItems
    : orgSecondaryNavItems;

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-sidebar-border border-r">
      <SidebarHeader className="px-5 py-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-base">
            <span className="text-lg font-bold text-white">✦</span>
          </div>
          <span className="text-sidebar-foreground text-xl font-semibold">
            Deployfolio
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 mb-2 px-2 text-xs font-medium uppercase tracking-wider">
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
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    {item.disabled ? (
                      <div className="flex items-center gap-3">
                        <item.icon className="text-sidebar-foreground/40 h-5 w-5" />
                        <span>{item.title}</span>
                        <span className="bg-sidebar-accent text-sidebar-foreground/60 ml-auto rounded px-1.5 py-0.5 text-xs">
                          Soon
                        </span>
                      </div>
                    ) : (
                      <Link href={item.url}>
                        <item.icon className="text-sidebar-foreground/60 h-5 w-5" />
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
          <SidebarGroupLabel className="text-sidebar-foreground/60 mb-2 px-2 text-xs font-medium uppercase tracking-wider">
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
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="text-sidebar-foreground/60 h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}