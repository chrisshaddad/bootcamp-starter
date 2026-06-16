import { Badge } from "@/components/ui/badge";
import { Repeat } from "lucide-react";
import type { Role, ItemType, Cadence, MemberStatus } from "@/lib/types";

export function ItemTypeBadge({ type }: { type: ItemType }) {
  return type === "PRODUCT" ? (
    <Badge className="border-transparent bg-primary-soft text-primary-300">Product</Badge>
  ) : (
    <Badge className="border-transparent bg-accent-base/10 text-accent-base">Service</Badge>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  if (role === "ADMIN" || role === "SUPER_ADMIN") {
    return (
      <Badge className="border-transparent bg-primary text-primary-foreground">
        {role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-muted-foreground">
      Member
    </Badge>
  );
}

const CADENCE_LABEL: Record<Cadence, string> = {
  ONE_OFF: "One-off",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export function RecurrenceBadge({ cadence }: { cadence: Cadence }) {
  if (cadence === "ONE_OFF") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        One-off
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-primary-base/30 text-primary-300">
      <Repeat className="size-3" />
      {CADENCE_LABEL[cadence]}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: MemberStatus }) {
  const active = status === "ACTIVE";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`size-1.5 rounded-full ${active ? "bg-success" : "bg-warning"}`}
      />
      {active ? "Active" : "Invited"}
    </span>
  );
}
