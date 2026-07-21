'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Menu, Search, Settings } from 'lucide-react';

import { useAuth, useUser } from '@/hooks/use-auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';

export function TopNavbar() {
  const { user } = useUser({
    redirectOnUnauthenticated: false,
  });

  const { logout } = useAuth();
  const { toggleSidebar } = useSidebar();

  const [searchQuery, setSearchQuery] = useState('');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const isSuperAdmin = hasMounted && user?.role === 'SUPER_ADMIN';

  const getInitials = () => {
    if (!hasMounted) {
      return 'U';
    }

    const name =
      user?.profile?.firstName || user?.name || user?.email?.split('@')[0];

    if (!name) {
      return 'U';
    }

    const nameParts = name.trim().split(/\s+/).filter(Boolean);

    if (nameParts.length >= 2) {
      return `${nameParts[0]?.charAt(0) ?? ''}${
        nameParts[1]?.charAt(0) ?? ''
      }`.toUpperCase();
    }

    return name.charAt(0).toUpperCase();
  };

  const getDisplayName = () => {
    if (!hasMounted) {
      return 'User';
    }

    if (isSuperAdmin) {
      return 'Super Admin';
    }

    return (
      user?.profile?.firstName ||
      user?.name ||
      user?.email?.split('@')[0] ||
      'User'
    );
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-[#e2e5ed] bg-white px-4 sm:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          title="Toggle sidebar"
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#657087] transition-colors hover:bg-[#f3f4f8] hover:text-[#0000FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0000FF]"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="relative hidden w-full max-w-[280px] sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9aa2b2]" />

          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={isSuperAdmin ? 'Search organizations...' : 'Search...'}
            aria-label={isSuperAdmin ? 'Search organizations' : 'Search'}
            className="h-8 w-full rounded-md border-0 bg-transparent pl-9 pr-3 text-[12px] text-[#26334d] shadow-none placeholder:text-[#a3aaba] focus-visible:border-transparent focus-visible:ring-0"
          />
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="flex h-9 items-center gap-2 rounded-md px-2 text-[#536078] hover:bg-[#f5f6fa] hover:text-[#26334d]"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-[#0000FF] text-[10px] font-bold text-white">
                {getInitials()}
              </AvatarFallback>
            </Avatar>

            <span className="hidden text-[11px] font-medium sm:inline">
              {getDisplayName()}
            </span>

            <ChevronDown className="h-3.5 w-3.5 text-[#8790a2]" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-48 rounded-lg border-[#e0e3eb] bg-white p-1 shadow-lg"
        >
          <DropdownMenuItem asChild>
            <Link
              href="/settings"
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-[12px]"
            >
              <Settings className="h-4 w-4" />

              <span>Settings</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => logout()}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-[12px] text-red-600 focus:bg-red-50 focus:text-red-600"
          >
            <LogOut className="h-4 w-4" />

            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
