'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Building2,
  Building,
  Compass,
  Library,
  IdCard,
  BookOpen,
  Clock,
  Bookmark,
  ShoppingCart,
  Feather,
  Tags,
  BookUp,
  BookDown,
  CalendarClock,
  UserCog,
  SlidersHorizontal,
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
  useSidebar,
} from '@/components/ui/sidebar';

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  disabled?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// SUPER_ADMIN: platform administration.
const superAdminNavGroups: NavGroup[] = [
  {
    label: 'Administration',
    items: [
      { title: 'Organizations', url: '/organizations', icon: Building2 },
      { title: 'Users', url: '/users', icon: Users },
    ],
  },
];

// STAFF (ORG_ADMIN + LIBRARIAN): daily library operations. Catalog + Members
// (reqs 2.2–2.6) are live; Circulation (2.7–2.9) is still "Soon".
const staffNavGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Catalog',
    items: [
      { title: 'Books', url: '/books', icon: BookOpen },
      { title: 'Authors', url: '/authors', icon: Feather },
      { title: 'Categories', url: '/categories', icon: Tags },
      {
        title: 'Publishers',
        url: '/publishers',
        icon: Building,
      },
    ],
  },
  {
    label: 'Members',
    items: [{ title: 'Members', url: '/members', icon: Users }],
  },
  {
    label: 'Circulation',
    items: [
      {
        title: 'Check-out',
        url: '/circulation/check-out',
        icon: BookUp,
      },
      {
        title: 'Check-in',
        url: '/circulation/check-in',
        icon: BookDown,
      },
      {
        title: 'Reservations',
        url: '/circulation/reservations',
        icon: Bookmark,
      },
      {
        title: 'Overdue',
        url: '/circulation/overdue',
        icon: CalendarClock,
      },
    ],
  },
];

// ORG_ADMIN only: staff management + library settings/branding (req 2.10).
const orgAdminNavGroup: NavGroup = {
  label: 'Administration',
  items: [
    { title: 'Staff', url: '/staff', icon: UserCog },
    {
      title: 'Library Settings',
      url: '/library-settings',
      icon: SlidersHorizontal,
    },
  ],
};

// MEMBER (patron): self-service portal - discover libraries, browse/buy/
// reserve books, manage rentals and holds.
const patronNavGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { title: 'Discover', url: '/discover', icon: Compass },
      { title: 'My Libraries', url: '/my-libraries', icon: Library },
      { title: 'Cart', url: '/cart', icon: ShoppingCart },
      { title: 'My Rentals', url: '/my-rentals', icon: Clock },
      { title: 'My Reservations', url: '/my-reservations', icon: Bookmark },
      { title: 'My Memberships', url: '/my-memberships', icon: IdCard },
    ],
  },
];

// Fallback shell for any role without a dedicated nav above.
const minimalNavGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [{ title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard }],
  },
];

const secondaryNavItems: NavItem[] = [
  { title: 'Settings', url: '/settings', icon: Settings },
];

function navGroupsForRole(role: string | undefined): NavGroup[] {
  if (role === 'SUPER_ADMIN') return superAdminNavGroups;
  if (role === 'ORG_ADMIN') return [...staffNavGroups, orgAdminNavGroup];
  if (role === 'LIBRARIAN') return staffNavGroups;
  if (role === 'MEMBER') return patronNavGroups;
  return minimalNavGroups;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const { isMobile, setOpenMobile } = useSidebar();

  const navGroups = navGroupsForRole(user?.role);

  // On mobile the nav lives in a Sheet overlay - selecting a page (or logging
  // out) should close it immediately rather than leaving it open on top of
  // the new page until the user taps the scrim or hits Escape.
  const closeMobileNav = () => {
    if (isMobile) setOpenMobile(false);
  };

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(url);
  };

  const renderItem = (item: NavItem) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton
        asChild={!item.disabled}
        isActive={isActive(item.url)}
        disabled={item.disabled}
        className={cn(
          'h-11 gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
          item.disabled && 'cursor-not-allowed opacity-50',
          isActive(item.url)
            ? 'bg-library-primary-100 text-library-primary-900 hover:bg-library-primary-200'
            : 'text-sidebar-foreground/70 hover:bg-library-primary-50 hover:text-sidebar-foreground',
        )}
      >
        {item.disabled ? (
          <div className="flex items-center gap-3">
            <item.icon className="h-5 w-5 text-muted-foreground/60" />
            <span>{item.title}</span>
            <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              Soon
            </span>
          </div>
        ) : (
          <Link href={item.url} onClick={closeMobileNav}>
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="px-5 py-6">
        {/* Logo */}
        <Link
          href="/dashboard"
          onClick={closeMobileNav}
          className="flex items-center gap-2.5"
        >
          <Image
            src="/nextshelf-icon.svg"
            alt="NextShelf"
            width={32}
            height={32}
            priority
            className="h-8 w-8"
          />
          <span className="text-xl font-semibold text-library-ink">
            NextShelf
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="overflow-x-hidden px-3">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{group.items.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarSeparator className="my-4" />

        {/* Secondary Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Support
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{secondaryNavItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                closeMobileNav();
                logout();
              }}
              className="h-11 gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-error-light hover:text-error"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
