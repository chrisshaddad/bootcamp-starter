'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Settings,
  Building2,
  TrendingUp,
  Receipt,
  Package,
  Briefcase,
  Upload,
  Target,
  Sparkles,
  Users,
} from 'lucide-react';
import { useUser } from '@/hooks/use-auth';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { OrganizationDetailResponse } from '@repo/contracts';
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
} from '@/components/ui/sidebar';

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const orgNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Products', url: '/products', icon: Package },
  { title: 'Services', url: '/services', icon: Briefcase },
  { title: 'Sales', url: '/sales', icon: TrendingUp },
  { title: 'Expenses', url: '/expenses', icon: Receipt },
  { title: 'Goals', url: '/goals', icon: Target },
  { title: 'Imports', url: '/imports', icon: Upload },
  { title: 'AI Insights', url: '/ai-insights', icon: Sparkles },
];

const superAdminNavItems: NavItem[] = [
  { title: 'Organizations', url: '/organizations', icon: Building2 },
  { title: 'Users', url: '/users', icon: Users, disabled: true },
];

const secondaryNavItems: NavItem[] = [
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useUser({ redirectOnUnauthenticated: false });

  const { data: currentOrganization } = useSWR<OrganizationDetailResponse>(
    user?.organizationId ? `/organizations/${user.organizationId}` : null,
    fetcher,
  );

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const mainNavItems = isSuperAdmin ? superAdminNavItems : orgNavItems;

  const isActive = (url: string) => {
    if (url === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(url);
  };

  const orgInitial = (
    isSuperAdmin ? 'S' : (user?.name?.[0] ?? '?')
  ).toUpperCase();
  const orgName = isSuperAdmin
    ? 'Super Admin'
    : (currentOrganization?.name ?? 'Organization');

  return (
    <Sidebar className="border-r border-border bg-sidebar">
      {/* Logo */}
      <SidebarHeader className="px-4 pb-4 pt-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          {/* Margin logo mark — gradient violet square with chart icon */}
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#936BFF] to-[#5B30D6]">
            <TrendingUp className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-foreground">
            Margin
          </span>
        </Link>
      </SidebarHeader>

      {/* Org card */}
      <div className="mx-3 mb-2">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#17132B] text-sm font-bold text-[#936BFF]">
            {orgInitial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {orgName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {isSuperAdmin ? 'Platform Administrator' : (user?.email ?? '')}
            </p>
          </div>
        </div>
      </div>

      <SidebarContent className="px-2 pt-1">
        {/* Main nav */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
            {isSuperAdmin ? 'Administration' : 'Main'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-px">
              {mainNavItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!item.disabled}
                      disabled={item.disabled}
                      className={cn(
                        'relative h-9 gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                        item.disabled && 'pointer-events-none opacity-40',
                        active
                          ? 'bg-[#17132B] text-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      {item.disabled ? (
                        <div className="flex w-full items-center gap-3">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.title}</span>
                          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                            Soon
                          </span>
                        </div>
                      ) : (
                        <Link
                          href={item.url}
                          className="flex w-full items-center gap-3"
                        >
                          {/* Active left indicator */}
                          {active && (
                            <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                          )}
                          <item.icon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              active ? 'text-primary' : '',
                            )}
                          />
                          <span>{item.title}</span>
                        </Link>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary nav */}
        <SidebarGroup className="mt-4 p-0">
          <SidebarGroupLabel className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/50">
            Support
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-px">
              {secondaryNavItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        'relative h-9 gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                        active
                          ? 'bg-[#17132B] text-foreground'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                      )}
                    >
                      <Link
                        href={item.url}
                        className="flex w-full items-center gap-3"
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                        )}
                        <item.icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            active ? 'text-primary' : '',
                          )}
                        />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — user row */}
      <SidebarFooter className="border-t border-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {user?.name?.[0]?.toUpperCase() ??
              user?.email?.[0]?.toUpperCase() ??
              '?'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">
              {user?.name ?? 'User'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
