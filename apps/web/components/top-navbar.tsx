'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import {
  LogOut,
  ChevronDown,
  Bell,
  Sun,
  Moon,
  UserCircle,
} from 'lucide-react';
import { useAuth, useUser } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function TopNavbar() {
  const { user } = useUser({ redirectOnUnauthenticated: false });
  const { logout } = useAuth();
  const { unreadCount } = useNotifications({ enabled: !!user });
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';

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
    if (user?.fullName) return user.fullName;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background px-6">
      {/* Left Section - Sidebar Toggle */}
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-1 h-9 w-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground" />
      </div>

      {/* Right Section - User */}
      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications bell */}
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Link href="/notifications" aria-label="Notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        </Button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex h-10 items-center gap-2 rounded-lg px-2 hover:bg-accent"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-primary-base text-sm font-medium text-white">
                  {getInitials(user?.fullName, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium text-foreground">
                  {getDisplayName()}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="flex items-center gap-2 text-error focus:bg-error-light focus:text-error"
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
