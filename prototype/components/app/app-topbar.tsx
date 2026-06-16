"use client";

import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { RoleSwitcher } from "./role-switcher";
import { UserMenu } from "./user-menu";
import { InviteButton } from "./invite-button";
import { Button } from "@/components/ui/button";

function titleFor(pathname: string) {
  const exact = NAV_ITEMS.find((i) => i.href === pathname);
  if (exact) return exact.label;
  if (pathname.startsWith("/settings")) return "Settings";
  return "Margin";
}

export function AppTopbar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>
      <h1 className="text-base font-semibold text-foreground">
        {titleFor(pathname)}
      </h1>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <RoleSwitcher />
        <InviteButton size="sm" variant="secondary" />
        <UserMenu />
      </div>
    </header>
  );
}
