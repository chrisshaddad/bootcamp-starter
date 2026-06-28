'use client';

import { usePathname } from 'next/navigation';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { federatedLogout } from '@/auth/federated-logout';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { MobileSidebarTrigger } from '@/components/layout/dashboard-sidebar';
import { useAppDispatch } from '@/store/hooks';
import { setTheme as setReduxTheme } from '@/store/slices/ui-slice';
import type { Role } from '@/auth/roles';
import type { Dictionary } from '@/i18n/get-dictionary';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  locale: string;
  userName: string;
  role: Role | null;
  dict: Dictionary;
};

// ---------------------------------------------------------------------------
// Page title derivation
// ---------------------------------------------------------------------------

const PAGE_TITLE_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  users: 'users',
  billing: 'billing',
  payments: 'payments',
  timeline: 'timeline',
};

function usePageTitle(dict: Dictionary): string {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  // segments[0] = locale, segments[1] = "dashboard", segments[2] = sub-page
  const sub = segments[2];

  if (!sub) return dict.nav.dashboard;

  const key = PAGE_TITLE_MAP[sub];
  if (!key) return sub;

  const navDict = dict.nav as Record<string, string>;
  return navDict[key] ?? sub;
}

// ---------------------------------------------------------------------------
// Theme toggle
// ---------------------------------------------------------------------------

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dispatch = useAppDispatch();

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    dispatch(setReduxTheme(next));
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label="Toggle theme"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

// ---------------------------------------------------------------------------
// User dropdown
// ---------------------------------------------------------------------------

function UserDropdown({
  userName,
  locale,
  dict,
}: {
  userName: string;
  locale: string;
  dict: Dictionary;
}) {
  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="rounded-full" />}
        aria-label="User menu"
      >
        <Avatar size="sm">
          <AvatarFallback className="bg-teal-600 text-xs text-white">
            {userInitial}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground">
            {userName || '—'}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => federatedLogout(locale)}
        >
          {dict.nav.logout}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ---------------------------------------------------------------------------
// Topbar
// ---------------------------------------------------------------------------

export function DashboardTopbar({ locale, userName, role, dict }: Props) {
  const pageTitle = usePageTitle(dict);

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-card px-4 gap-3">
      {/* Mobile hamburger */}
      <MobileSidebarTrigger
        locale={locale}
        role={role}
        dict={dict}
        userName={userName}
      />

      {/* Page title */}
      <h1 className="flex-1 truncate text-sm font-semibold text-foreground">
        {pageTitle}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <LocaleSwitcher currentLocale={locale} variant="muted" />
        <Separator orientation="vertical" className="mx-1 h-4" />
        <ThemeToggle />
        <UserDropdown userName={userName} locale={locale} dict={dict} />
      </div>
    </header>
  );
}
