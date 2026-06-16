"use client";

import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/**
 * Demo affordance: flip the effective role between Admin and Member to preview how
 * the UI gates editing. Would not ship in the real app.
 */
export function RoleSwitcher() {
  const { effectiveRole, dispatch } = useStore();
  const current = effectiveRole === "MEMBER" ? "MEMBER" : "ADMIN";

  return (
    <div
      className="inline-flex items-center gap-2"
      title="Demo: preview the app as an Admin or a Member"
    >
      <span className="hidden text-xs text-muted-foreground sm:inline">
        Preview as
      </span>
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
        {(["ADMIN", "MEMBER"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => dispatch({ type: "SET_DEMO_ROLE", role: r })}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              current === r
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r === "ADMIN" ? "Admin" : "Member"}
          </button>
        ))}
      </div>
    </div>
  );
}
