// Sidebar navigation config for the authenticated app shell.
import {
  LayoutDashboard,
  Package,
  Receipt,
  Tags,
  Users,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Only show to Admins. */
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Items", href: "/items", icon: Package },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Categories", href: "/expenses/categories", icon: Tags },
  { label: "Members", href: "/members", icon: Users },
  { label: "AI Insights", href: "/insights", icon: Sparkles },
  { label: "Settings", href: "/settings", icon: Settings },
];
