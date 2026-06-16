// Domain types for the Margin prototype. Mirrors the glossary in docs/CONTEXT.md.
// SUPER_ADMIN exists in the union (platform role) but is never surfaced in the prototype UI.

export type Role = "SUPER_ADMIN" | "ADMIN" | "MEMBER";
export type ItemType = "PRODUCT" | "SERVICE";
export type Cadence = "ONE_OFF" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type MemberStatus = "ACTIVE" | "INVITED";

export interface User {
  id: string;
  name: string;
  email: string;
  /** A token color for the generated avatar. */
  avatarColor: string;
}

export interface Organization {
  id: string;
  name: string;
  businessType?: string;
  currency: "USD";
  createdAt: string;
}

export interface Member {
  id: string;
  userId: string;
  orgId: string;
  role: Role;
  status: MemberStatus;
  joinedAt: string;
  user: User;
}

export interface Item {
  id: string;
  orgId: string;
  name: string;
  type: ItemType;
  /** Sale price per unit, USD. */
  price: number;
  /** Direct cost per unit, USD. */
  unitCost: number;
  createdAt: string;
}

/** Seeded mock data only — there is no manual Sale entry in the prototype. */
export interface Sale {
  id: string;
  orgId: string;
  itemId: string;
  quantity: number;
  /** ISO date string. */
  soldAt: string;
}

export interface ExpenseCategory {
  id: string;
  orgId: string;
  name: string;
  /** Hex color for the category chip. */
  color: string;
  recurring: boolean;
}

export interface Expense {
  id: string;
  orgId: string;
  categoryId: string;
  description: string;
  amount: number;
  /** ISO date string. */
  date: string;
  cadence: Cadence;
}

/** The full mock dataset for one organization. */
export interface OrgDataset {
  organization: Organization;
  members: Member[];
  items: Item[];
  sales: Sale[];
  categories: ExpenseCategory[];
  expenses: Expense[];
}
