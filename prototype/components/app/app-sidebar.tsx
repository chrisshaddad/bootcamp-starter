"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";
import { Logo } from "@/components/brand/logo";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { currentOrg } = useStore();

  return (
    <div className="flex h-full w-[260px] flex-col bg-sidebar">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo />
        </Link>
      </div>

      {currentOrg && (
        <div className="mx-3 mb-2 flex items-center gap-3 rounded-lg border border-sidebar-border bg-card/50 px-3 py-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-sm font-semibold text-primary-300">
            {currentOrg.name[0]}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {currentOrg.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {currentOrg.businessType ?? "Organization"}
            </p>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary-base" />
              )}
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  active
                    ? "text-primary-300"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-lg bg-card/40 px-3 py-2 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-accent-base" />
          Prototype · mock data
        </div>
      </div>
    </div>
  );
}
