'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  UserPlus,
  Users,
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

import { useEffect, useState } from 'react';

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  disabled?: boolean;
  badge?: string;
}

const organizationNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Assignments',
    url: '/teacher/assignments',
    icon: ClipboardList,
  },
];

const superAdminNavItems: NavItem[] = [
  {
    title: 'Courses',
    url: '/courses',
    icon: BookOpen,
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
    disabled: true,
    badge: 'New',
  },
];

const organizationSupportItems: NavItem[] = [
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
];

const superAdminSupportItems: NavItem[] = [
  {
    title: 'Create User',
    url: '/users/create',
    icon: UserPlus,
  },
  {
    title: 'Create Course',
    url: '/courses/create',
    icon: BookOpen,
  },
  {
    title: 'Settings',
    url: '/settings',
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useUser({
    redirectOnUnauthenticated: false,
  });

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isSuperAdmin = hasMounted && user?.role === 'SUPER_ADMIN';

  const mainNavItems = isSuperAdmin ? superAdminNavItems : organizationNavItems;

  const supportItems = isSuperAdmin
    ? superAdminSupportItems
    : organizationSupportItems;

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return pathname === '/dashboard';
    }

    return pathname === url || pathname.startsWith(`${url}/`);
  };

  const renderNavigationItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.url);

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton
          asChild={!item.disabled}
          disabled={item.disabled}
          isActive={active}
          tooltip={item.title}
          className={cn(
            'relative h-9 gap-3 rounded-md px-3 text-[13px] font-semibold',
            'transition-colors duration-150',
            'group-data-[collapsible=icon]:h-9',
            'group-data-[collapsible=icon]:w-9',
            'group-data-[collapsible=icon]:justify-center',
            'group-data-[collapsible=icon]:px-0',
            item.disabled && 'cursor-not-allowed opacity-100',
            active
              ? 'bg-[#eef2ff] text-[#0000FF] hover:bg-[#e8edff] hover:text-[#0000FF]'
              : 'text-[#26334d] hover:bg-[#f4f6fb] hover:text-[#0000FF]',
          )}
        >
          {item.disabled ? (
            <div className="flex w-full items-center gap-3">
              <Icon className="h-4 w-4 shrink-0 text-[#34425f]" />

              <span className="truncate group-data-[collapsible=icon]:hidden">
                {item.title}
              </span>
            </div>
          ) : (
            <Link href={item.url}>
              <Icon
                className={cn(
                  'h-4 w-4 shrink-0',
                  active ? 'text-[#0000FF]' : 'text-[#34425f]',
                )}
              />

              <span className="truncate group-data-[collapsible=icon]:hidden">
                {item.title}
              </span>
            </Link>
          )}
        </SidebarMenuButton>

        {item.badge && (
          <SidebarMenuBadge className="right-2 top-1/2 h-5 -translate-y-1/2 rounded-full border border-[#ccccff] bg-[#eeeeff] px-2 text-[9px] font-semibold text-[#0000FF] group-data-[collapsible=icon]:hidden">
            {item.badge}
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-[#dfe3ec] bg-white">
      <SidebarHeader className="border-b border-[#e7e9f0] bg-white px-3 py-4">
        <Link
          href="/dashboard"
          className="flex min-h-11 items-center gap-3 overflow-hidden rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0000FF] shadow-sm">
            <Building2 className="h-5 w-5 text-white" />
          </div>

          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-[14px] font-bold leading-5 text-[#26334d]">
              EduMario
            </p>

            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[#7c879d]">
              Administration
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="bg-white px-2 py-4">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="mb-2 h-auto px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a93a7] group-data-[collapsible=icon]:hidden">
            {isSuperAdmin ? 'Administration' : 'Main'}
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {mainNavItems.map(renderNavigationItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-6 p-0">
          <SidebarGroupLabel className="mb-2 h-auto px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-[#8a93a7] group-data-[collapsible=icon]:hidden">
            Support
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {supportItems.map(renderNavigationItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-[#e3e6ed] bg-white p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              onClick={() => logout()}
              tooltip="Logout"
              className={cn(
                'h-10 gap-3 rounded-md px-3 text-[13px] font-semibold',
                'text-[#d8273f] transition-colors',
                'hover:bg-[#fff1f3] hover:text-[#bd1e34]',
                'group-data-[collapsible=icon]:h-9',
                'group-data-[collapsible=icon]:w-9',
                'group-data-[collapsible=icon]:justify-center',
                'group-data-[collapsible=icon]:px-0',
              )}
            >
              <LogOut className="h-4 w-4 shrink-0 text-current" />

              <span className="group-data-[collapsible=icon]:hidden">
                Logout
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
