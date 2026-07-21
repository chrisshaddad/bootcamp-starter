'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  KeyRoundIcon,
  LifeBuoyIcon,
  UserIcon,
  LogOutIcon,
} from 'lucide-react';

import { federatedLogout } from '@/auth/federated-logout';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { Dictionary } from '@/i18n/get-dictionary';
import { getPortalDict } from '@/components/portal/portal-dict';

type NavKey = 'home' | 'availableUnits' | 'support' | 'profile';

type NavItem = {
  key: NavKey;
  label: string;
  href: string;
  icon: React.ElementType;
};

type Props = {
  locale: string;
  dict: Dictionary;
  userName: string;
  children: ReactNode;
};

function buildNavItems(locale: string, t: ReturnType<typeof getPortalDict>): NavItem[] {
  const base = `/${locale}/portal`;
  return [
    { key: 'home', label: t.nav.home, href: base, icon: HomeIcon },
    {
      key: 'availableUnits',
      label: t.nav.availableUnits,
      href: `${base}/available-units`,
      icon: KeyRoundIcon,
    },
    {
      key: 'support',
      label: t.nav.support,
      href: `${base}/support`,
      icon: LifeBuoyIcon,
    },
    {
      key: 'profile',
      label: t.nav.profile,
      href: `${base}/profile`,
      icon: UserIcon,
    },
  ];
}

export function PortalShell({ locale, dict, userName, children }: Props) {
  const t = getPortalDict(dict, locale);
  const pathname = usePathname();
  const router = useRouter();
  const items = buildNavItems(locale, t);
  const homeHref = `/${locale}/portal`;

  const userInitial = userName ? userName.charAt(0).toUpperCase() : 'U';

  function isActive(href: string) {
    if (href === homeHref) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    // Warm, light, app-like chrome — deliberately NOT the admin navy sidebar.
    // A soft amber wash sets the resident-facing tone across light + dark.
    <div className="relative flex min-h-screen flex-col bg-gradient-to-b from-amber-50/70 via-background to-background dark:from-amber-950/20 dark:via-background">
      {/* ── Top bar: brand · desktop nav · account ─────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4">
          {/* Brand */}
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
              <HomeIcon className="size-4 text-white" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-foreground">
                {dict.app.name}
              </span>
              <span className="truncate text-[11px] font-medium text-amber-700 dark:text-amber-400">
                {t.brandSubtitle}
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="mx-auto hidden items-center gap-1 md:flex">
            {items.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60',
                    active
                      ? 'bg-amber-100/80 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200'
                      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground',
                  ].join(' ')}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Account menu */}
          <div className="ms-auto md:ms-0">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    className="h-11 gap-2 rounded-full px-1.5 ps-1.5 pe-2.5"
                  />
                }
                aria-label={t.userMenu.openMenu}
              >
                <Avatar size="sm">
                  <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-semibold text-white">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-[10rem] truncate text-sm font-medium text-foreground sm:inline">
                  {userName || '—'}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom" className="w-56">
                {/* Plain header (not DropdownMenuLabel — base-ui GroupLabel must
                    live inside a Group; see topbar note). */}
                <div className="flex flex-col px-2 py-1.5">
                  <span className="text-[11px] text-muted-foreground">
                    {t.userMenu.signedInAs}
                  </span>
                  <span className="truncate text-sm font-medium text-foreground">
                    {userName || '—'}
                  </span>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push(`/${locale}/portal/profile`)}
                >
                  <UserIcon />
                  {t.userMenu.profile}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => federatedLogout(locale)}
                >
                  <LogOutIcon />
                  {t.userMenu.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      {/* Extra bottom padding on mobile clears the fixed tab bar + safe area. */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-28 md:pb-12">
        {children}
      </main>

      {/* ── Mobile bottom tab bar ──────────────────────────────────────────── */}
      <nav
        aria-label={t.brandSubtitle}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/85 backdrop-blur-md md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto grid max-w-3xl grid-cols-4">
          {items.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/60',
                  active
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                    active
                      ? 'bg-amber-100 dark:bg-amber-400/15'
                      : 'bg-transparent',
                  ].join(' ')}
                >
                  <Icon className="size-5" />
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
