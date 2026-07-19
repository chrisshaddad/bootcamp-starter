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
  ClipboardList,
  BookOpen,
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
  disabled?: boolean;
}

const orgNavItems: NavItem[] = [
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
    title: 'Organizations',
    url: '/organizations',
    icon: Building2,
  },
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
    title: 'Create User',
    url: '/users/create',
    icon: Users,
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
  const { user } = useUser({ redirectOnUnauthenticated: false });

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

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
    <Sidebar collapsible="icon" className="border-r border-gray-200 bg-white">
      <SidebarHeader className="p-2">
        <Link
          href="/dashboard"
          className="flex min-h-12 items-center gap-2.5 overflow-hidden rounded-lg px-2 transition-colors hover:bg-gray-50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-base shadow-sm">
            <span className="text-lg font-bold text-white">✦</span>
          </div>

          <span className="whitespace-nowrap text-xl font-semibold text-gray-900 group-data-[collapsible=icon]:hidden">
            Bootcamp Starter
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-500">
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
                    tooltip={item.title}
                    className={cn(
                      'h-11 gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      'group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-2',
                      item.disabled && 'cursor-not-allowed opacity-50',
                      isActive(item.url)
                        ? 'bg-primary-100 text-gray-900 hover:bg-primary-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )}
                  >
                    {item.disabled ? (
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 shrink-0 text-gray-400" />

                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>

                        <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 group-data-[collapsible=icon]:hidden">
                          Soon
                        </span>
                      </div>
                    ) : (
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5 shrink-0 text-gray-500" />

                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            Support
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                      'h-11 gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                      'group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-2',
                      isActive(item.url)
                        ? 'bg-primary-100 text-gray-900 hover:bg-primary-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5 shrink-0 text-gray-500" />

                      <span className="group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => logout()}
              tooltip="Logout"
              className="h-11 gap-3 rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:p-2"
            >
              <LogOut className="h-5 w-5 shrink-0 text-gray-500" />

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
