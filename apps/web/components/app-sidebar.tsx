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
  Pill,
  ScrollText,
  UserCircle2,
  Package,
  MessageSquare,
  Search,
} from 'lucide-react';
import type { UserRole } from '@repo/contracts';
import { useAuth, useUser } from '@/hooks/use-auth';
import { homePathForRole } from '@/lib/role-routes';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/brand/logo';
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
  // Not-yet-built pages render as a disabled "Soon" item instead of a dead link.
  // The area's owner flips this off when they ship the page.
  disabled?: boolean;
}

// SUPER_ADMIN — platform-wide console.
const superAdminNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
  { title: 'Pharmacies', url: '/admin/pharmacies', icon: Building2 },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Medicines', url: '/admin/medicines', icon: Pill },
  { title: 'Audit Logs', url: '/admin/audit', icon: ScrollText },
  { title: 'Profile', url: '/admin/profile', icon: UserCircle2 },
];

// Every pharmacy user (admin down to branch staff) manages a personal profile
// at the shared, location-free /profile route. The super admin has its own
// location-aware profile under /admin/profile instead.
const profileNavItem: NavItem = {
  title: 'Profile',
  url: '/profile',
  icon: UserCircle2,
};

// PHARMACY_ADMIN — manages one pharmacy across all its branches.
const pharmacyAdminNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/pharmacy', icon: LayoutDashboard },
  { title: 'Branches', url: '/pharmacy/branches', icon: Building2 },
  // Stock sits right after Branches — cross-branch inventory oversight is a
  // primary admin task, so it leads before staff management.
  { title: 'Stock', url: '/stock', icon: Package },
  { title: 'Employees', url: '/pharmacy/employees', icon: Users },
  // Inquiries is cross-branch oversight for the admin; the officer sees the same
  // area scoped to their own branch. (Role→page wiring is finalized later — the
  // admin can reach it here for now.)
  { title: 'Inquiries', url: '/inquiries', icon: MessageSquare },
  { title: 'Audit Logs', url: '/pharmacy/audit', icon: ScrollText },
  profileNavItem,
];

// PHARMACY_MANAGER — one branch.
const branchNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/branch', icon: LayoutDashboard },
  profileNavItem,
];

// PHARMACY_EMPLOYEE — one branch, plus read-only visibility of that branch's
// stock and inquiries (the pages hide every mutation control for this role).
const employeeNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/branch', icon: LayoutDashboard },
  { title: 'Stock', url: '/stock', icon: Package },
  { title: 'Inquiries', url: '/inquiries', icon: MessageSquare },
  profileNavItem,
];

// STOCK_MANAGER — branch inventory. Labelled "Stock" to match the page heading.
const stockNavItems: NavItem[] = [
  { title: 'Stock', url: '/stock', icon: Package },
  profileNavItem,
];

// INQUIRY_OFFICER — branch inquiries queue.
const inquiryNavItems: NavItem[] = [
  { title: 'Inquiries', url: '/inquiries', icon: MessageSquare },
  profileNavItem,
];

// CLIENT — the consumer portal nav. Like every staff panel it ends with the
// shared Profile item (identity + saved location); Settings (password) is
// appended for every role from secondaryNavItems below. Not-yet-built areas
// show as disabled "Soon" until their owner (Person B) ships the page.
const clientNavItems: NavItem[] = [
  { title: 'Find medicines', url: '/find', icon: Search },
  { title: 'Pharmacies', url: '/pharmacies', icon: Building2 },
  {
    title: 'My inquiries',
    url: '/my/inquiries',
    icon: MessageSquare,
    disabled: true,
  },
  profileNavItem,
];

// Fallback — neutral landing for any role without a dedicated panel.
const orgNavItems: NavItem[] = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
];

// Settings is shared by every authenticated role.
const secondaryNavItems: NavItem[] = [
  { title: 'Settings', url: '/settings', icon: Settings },
];

// Pick the nav panel + group label for a role. Mirrors the role→home map in
// lib/role-routes.ts — keep the two in sync when adding a panel.
function panelForRole(role: UserRole | undefined): {
  items: NavItem[];
  label: string;
} {
  switch (role) {
    case 'SUPER_ADMIN':
      return { items: superAdminNavItems, label: 'Administration' };
    case 'PHARMACY_ADMIN':
      return { items: pharmacyAdminNavItems, label: 'Pharmacy' };
    case 'PHARMACY_MANAGER':
      return { items: branchNavItems, label: 'Branch' };
    case 'PHARMACY_EMPLOYEE':
      return { items: employeeNavItems, label: 'Branch' };
    case 'STOCK_MANAGER':
      return { items: stockNavItems, label: 'Stock' };
    case 'INQUIRY_OFFICER':
      return { items: inquiryNavItems, label: 'Inquiries' };
    case 'CLIENT':
      return { items: clientNavItems, label: 'Menu' };
    default:
      return { items: orgNavItems, label: 'Main' };
  }
}

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useUser({ redirectOnUnauthenticated: false });

  const { items: mainNavItems, label: mainNavLabel } = panelForRole(user?.role);
  const homeHref = homePathForRole(user?.role);

  // Determine the single most specific matching nav item for the current
  // pathname. Using plain `startsWith` per item breaks when one item's url
  // (e.g. /admin) is a prefix of another's (e.g. /admin/users) — both would
  // match and highlight simultaneously. Instead, collect every item whose
  // url matches (exactly, or as a parent path segment) and pick the longest
  // one, so only the most specific section is ever active.
  const allUrls = [...mainNavItems, ...secondaryNavItems].map(
    (item) => item.url,
  );
  const activeUrl = allUrls
    .filter((url) => pathname === url || pathname.startsWith(`${url}/`))
    .reduce<
      string | null
    >((longest, current) => (longest === null || current.length > longest.length ? current : longest), null);

  const isActive = (url: string) => url === activeUrl;

  return (
    <Sidebar className="border-r border-gray-200 bg-white">
      <SidebarHeader className="px-5 py-6">
        {/* Logo */}
        <Link href={homeHref} aria-label="MedFind Lebanon home">
          <Logo />
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-gray-500">
            {mainNavLabel}
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
                        ? 'bg-primary-100 text-gray-900 hover:bg-primary-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )}
                  >
                    {item.disabled ? (
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 text-gray-400" />
                        <span>{item.title}</span>
                        <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      </div>
                    ) : (
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5 text-gray-500" />
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
