'use client';

import Link from 'next/link';
import { Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth, useUser } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Design 4 — logo mark: amber tile + document glyph */
function BrandMark() {
  return (
    <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-amber">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M3 2.5h7l3 3V13a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5V3a.5.5 0 0 1 .5-.5Z"
          stroke="var(--amber-contrast)"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 2.5V6h3.5M5 8.5h6M5 10.8h4"
          stroke="var(--amber-contrast)"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function TopNavbar() {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const { logout } = useAuth();

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      const parts = name.split(' ').filter(Boolean);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <header className="flex items-center gap-3.5 border-b border-border bg-surface px-[18px] py-2.5">
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <BrandMark />
        <span className="font-display text-base font-medium text-text-1">
          Registry
        </span>
      </Link>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-10 items-center gap-2 rounded-lg px-2 hover:bg-sunken"
            >
              <Avatar className="h-[30px] w-[30px] rounded-lg">
                <AvatarImage src={undefined} />
                <AvatarFallback className="rounded-lg bg-amber-soft text-xs font-bold text-amber-strong">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-text-1 md:block">
                {getDisplayName()}
              </span>
              <ChevronDown className="h-4 w-4 text-text-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="flex items-center gap-2 text-danger focus:bg-error-light focus:text-danger"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
