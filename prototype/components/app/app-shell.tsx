"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { hydrated, currentUser, currentOrg } = useStore();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Route guard: once hydrated, bounce out if there's no signed-in user / org.
  useEffect(() => {
    if (hydrated && (!currentUser || !currentOrg)) {
      router.replace(currentUser ? "/onboarding" : "/login");
    }
  }, [hydrated, currentUser, currentOrg, router]);

  if (!hydrated || !currentUser || !currentOrg) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border lg:block">
        <AppSidebar />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[260px] border-sidebar-border p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar onMenu={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
