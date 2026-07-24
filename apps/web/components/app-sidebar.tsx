'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  TrendingUp,
  User,
  Users,
  FolderKanban,
  LogOut,
  Building2,
  Loader2,
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

// Employee-facing navigation
const employeeNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Opportunities',
    url: '/opportunities',
    icon: Briefcase,
  },
  {
    title: 'My Applications',
    url: '/applications',
    icon: FileText,
  },
  {
    title: 'Career Paths',
    url: '/career-paths',
    icon: TrendingUp,
  },
  {
    title: 'My Profile',
    url: '/profile',
    icon: User,
  },
];

// Additional nav items for users who also manage people (see UserRole in schema.prisma —
// there is no separate MANAGER role; managers are employees with subordinates).
const managerNavItems: NavItem[] = [
  {
    title: 'Team Overview',
    url: '/team',
    icon: Users,
  },
  {
    title: 'Manage Openings',
    url: '/openings',
    icon: FolderKanban,
  },
];

// Navigation items for SUPER_ADMIN role - a platform-level admin, not an
// employee, so this is the entirety of their nav (see
// (authenticated)/layout.tsx, which enforces this the same way route-side).
const superAdminNavItems: NavItem[] = [
  {
    title: 'Organizations',
    url: '/organizations',
    icon: Building2,
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
  },
];

function NavItemsList({
  items,
  isActive,
}: {
  items: NavItem[];
  isActive: (url: string) => boolean;
}) {
  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild={!item.disabled}
            isActive={isActive(item.url)}
            disabled={item.disabled}
            className={cn(
              'h-11 gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
              item.disabled && 'cursor-not-allowed opacity-50',
              isActive(item.url)
                ? 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90'
                : 'text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground',
            )}
          >
            {item.disabled ? (
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-sidebar-foreground/40" />
                <span>{item.title}</span>
                <span className="ml-auto text-xs bg-sidebar-accent text-sidebar-foreground/60 px-1.5 py-0.5 rounded">
                  Soon
                </span>
              </div>
            ) : (
              <Link href={item.url}>
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </Link>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isManager = Boolean(user?.isManager) && !isSuperAdmin;

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(url);
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="px-5 py-6">
        {/* Logo */}
        <Link
          href={isSuperAdmin ? '/organizations' : '/dashboard'}
          className="flex items-center gap-2.5"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <TrendingUp className="h-4.5 w-4.5 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-sidebar-foreground">
            PathWay
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3">
        {!isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
              Employee
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItemsList items={employeeNavItems} isActive={isActive} />
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isManager && (
          <>
            <SidebarSeparator className="my-4" />

            <SidebarGroup>
              <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
                Manager
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <NavItemsList items={managerNavItems} isActive={isActive} />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {isSuperAdmin && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/60">
                Administration
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <NavItemsList items={superAdminNavItems} isActive={isActive} />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="h-11 gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-destructive/90 hover:text-white"
            >
              {isLoggingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
              <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
