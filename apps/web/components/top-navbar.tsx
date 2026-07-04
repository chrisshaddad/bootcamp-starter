'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Settings, LogOut, ChevronDown, UserCog } from 'lucide-react';
import { useAuth, useUser } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [searchQuery, setSearchQuery] = useState('');

  const isSuperAdmin = user?.accountType === 'SUPER_ADMIN';

  const getInitials = (displayName?: string | null, email?: string) => {
    if (displayName) {
      const parts = displayName.split(' ').filter(Boolean);
      if (parts.length >= 2 && parts[0] && parts[1]) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      }
      return displayName.charAt(0).toUpperCase();
    }
    return email?.charAt(0).toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    const name =
      user?.developerProfile?.displayName ||
      user?.hiringProfile?.organizationName;
    if (name) return name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  return (
    <header className="border-border bg-card flex h-16 items-center justify-between border-b px-6">
      {/* Left Section - Sidebar Toggle & Search */}
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:bg-accent hover:text-accent-foreground -ml-1 h-9 w-9" />

        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            placeholder={isSuperAdmin ? 'Search organizations...' : 'Search...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-border bg-input/30 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/20 h-10 w-64 rounded-lg pl-10 text-sm"
          />
        </div>
      </div>

      {/* Right Section - User */}
      <div className="flex items-center gap-3">
        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="hover:bg-accent flex h-10 items-center gap-2 rounded-lg px-2"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={user?.developerProfile?.profilePictureUrl ?? undefined}
                />
                <AvatarFallback className="bg-primary-base text-sm font-medium text-white">
                  {getInitials(getDisplayName(), user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-foreground text-sm font-medium">
                  {getDisplayName()}
                </p>
              </div>
              <ChevronDown className="text-muted-foreground h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {!isSuperAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2">
                  <UserCog className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2"
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
