'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, ClipboardList, User, LogOut } from 'lucide-react';
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
  {
    title: 'My Subscriptions',
    url: '/portal/subscriptions',
    icon: ClipboardList,
  },
  { title: 'Available Plans', url: '/portal/plans', icon: ClipboardList },
  { title: 'My Profile', url: '/portal/profile', icon: User },
];

/** Auto-generated docstring */
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
    <Sidebar className="border-r border-gray-200 bg-white">
      <SidebarHeader className="px-5 py-6">
        <Link href="/portal" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-base">
            <span className="text-lg font-bold text-white">✦</span>
          </div>
          <span className="text-xl font-semibold text-gray-900">
            Member Portal
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3">
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-500">
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
                        ? 'bg-primary-100 text-gray-900 hover:bg-primary-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-5 w-5 text-gray-500" />
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
            <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-500">
              Account
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
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
              className="h-11 gap-3 rounded-lg px-3 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-5 w-5 text-gray-500" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
