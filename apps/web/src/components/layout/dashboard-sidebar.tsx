'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { federatedLogout } from '@/auth/federated-logout';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Activity,
  DollarSign,
  LogOut,
  Building2,
  Menu,
  BarChart3,
  Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import type { Role } from '@/auth/roles';
import { canAccess } from '@/auth/permissions';
import type { Dictionary } from '@/i18n/get-dictionary';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NavItem = {
  key: string;
  label: string;
  icon: React.ElementType;
  href: string;
  /** If set, visible only when canAccess(role, areaKey) is true. */
  areaKey: import('@/auth/permissions').DashboardArea;
};

type Props = {
  locale: string;
  role: Role | null;
  dict: Dictionary;
  userName?: string;
};

// ---------------------------------------------------------------------------
// Nav item definitions
// ---------------------------------------------------------------------------

function buildNavItems(
  locale: string,
  role: Role | null,
  dict: Dictionary,
): NavItem[] {
  const isMaintenance = role === 'maintenance';

  return [
    {
      key: 'dashboard',
      label: dict.nav.dashboard,
      icon: LayoutDashboard,
      href: `/${locale}/dashboard`,
      areaKey: 'dashboard',
    },
    {
      key: 'buildings',
      label: isMaintenance ? dict.nav.myBuildings : dict.nav.buildings,
      icon: Building2,
      href: `/${locale}/dashboard/buildings`,
      areaKey: 'buildings',
    },
    {
      key: 'users',
      label: dict.nav.users,
      icon: Users,
      href: `/${locale}/dashboard/users`,
      areaKey: 'users',
    },
    {
      key: 'payments',
      label: dict.nav.payments,
      icon: DollarSign,
      href: `/${locale}/dashboard/payments`,
      areaKey: 'payments',
    },
    {
      key: 'reports',
      label: dict.nav.reports,
      icon: BarChart3,
      href: `/${locale}/dashboard/reports`,
      areaKey: 'reports',
    },
    {
      key: 'tasks',
      label: dict.nav.tasks,
      icon: Wrench,
      href: `/${locale}/dashboard/tasks`,
      areaKey: 'tasks',
    },
    {
      key: 'billing',
      label: dict.nav.billing,
      icon: CreditCard,
      href: `/${locale}/dashboard/billing`,
      areaKey: 'billing',
    },
    {
      key: 'timeline',
      label: dict.nav.timeline,
      icon: Activity,
      href: `/${locale}/dashboard/timeline`,
      areaKey: 'timeline',
    },
  ];
}

// ---------------------------------------------------------------------------
// Sidebar content (shared between desktop aside and mobile Sheet)
// ---------------------------------------------------------------------------

function SidebarContent({
  locale,
  role,
  dict,
  userName,
  onNavClick,
}: Props & { onNavClick?: () => void }) {
  const pathname = usePathname();
  const allItems = buildNavItems(locale, role, dict);

  // Filter items by role permissions using the single matrix.
  const visibleItems = allItems.filter((item) => canAccess(role, item.areaKey));

  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  function isActive(href: string) {
    // Exact match for dashboard root, prefix match for sub-pages
    if (href === `/${locale}/dashboard`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-teal-500">
          <Building2 className="size-4 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-wide text-white">
          {dict.app.name}
        </span>
      </div>

      <Separator className="bg-white/10" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={onNavClick}
              className={[
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'border-l-2 border-teal-400 bg-white/10 pl-[10px] text-white'
                  : 'border-l-2 border-transparent text-white/60 hover:bg-white/5 hover:text-white/90',
              ].join(' ')}
            >
              <Icon
                className={[
                  'size-4 shrink-0 transition-colors',
                  active
                    ? 'text-teal-400'
                    : 'text-white/50 group-hover:text-white/80',
                ].join(' ')}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user + sign out */}
      <div className="px-3 pb-4">
        <Separator className="mb-3 bg-white/10" />
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar size="sm">
            <AvatarFallback className="bg-teal-600 text-xs text-white">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">
              {userName || '—'}
            </p>
            {role && (
              <p className="truncate text-[11px] text-white/50 capitalize">
                {dict.auth.roles[role] ?? role}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            title={dict.nav.logout}
            onClick={() => federatedLogout(locale)}
            className="shrink-0 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-3.5" />
            <span className="sr-only">{dict.nav.logout}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile trigger button (exported for use in topbar)
// ---------------------------------------------------------------------------

export function MobileSidebarTrigger({ locale, role, dict, userName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon-sm" className="lg:hidden" />}
        aria-label={dict.nav.menu}
      >
        <Menu className="size-4" />
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton
        className="w-64 bg-[#0A1628] p-0"
      >
        <SidebarContent
          locale={locale}
          role={role}
          dict={dict}
          userName={userName}
          onNavClick={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Desktop sidebar
// ---------------------------------------------------------------------------

export function DashboardSidebar({ locale, role, dict, userName }: Props) {
  return (
    <motion.aside
      className="hidden w-64 shrink-0 flex-col bg-[#0A1628] lg:flex"
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <SidebarContent
        locale={locale}
        role={role}
        dict={dict}
        userName={userName}
      />
    </motion.aside>
  );
}
