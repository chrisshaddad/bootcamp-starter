import { z } from 'zod';

/**
 * @repo/contracts — the single source of truth for the HTTP API contract
 * shared between the NestJS backend (forward-mena-be) and the Next.js client
 * (forward-mena-fe). Enums are zod schemas (runtime-checkable); response/body
 * shapes are plain types. The web's `src/types/api.ts` re-exports this module.
 */

// ── Envelopes ────────────────────────────────────────────────────────────────

export type ApiErrorEnvelope = {
  status: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type ApiEnvelope<TData> = {
  data: TData;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
};

// ── Enums (zod = single source of truth, runtime-checkable) ───────────────────

export const orgStatusSchema = z.enum([
  'PENDING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
]);
export type OrgStatus = z.infer<typeof orgStatusSchema>;

export const subscriptionStatusSchema = z.enum([
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'INCOMPLETE',
  'TRIALING',
  'UNPAID',
  'PAUSED',
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export const paymentStatusSchema = z.enum([
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

/**
 * Wire role — lowercase, matches Keycloak realm roles and the Role enum in
 * the web's auth/roles.ts.
 */
export const memberRoleSchema = z.enum([
  'org_admin',
  'supervisor',
  'finance',
  'maintenance',
  'tenant',
]);
export type MemberRole = z.infer<typeof memberRoleSchema>;

/** Roles that can be created/assigned by an admin (not org_admin, not tenant). */
export const assignableRoleSchema = z.enum([
  'supervisor',
  'finance',
  'maintenance',
]);
export type AssignableRole = z.infer<typeof assignableRoleSchema>;

/**
 * @deprecated Use MemberRole (lowercase). Kept so existing client code that
 * references UPPERCASE literals still compiles while it is being migrated.
 */
export type MemberRoleUppercase =
  'ORG_ADMIN' | 'SUPERVISOR' | 'FINANCE' | 'MAINTENANCE' | 'TENANT';

// ── Me / Provisioning ──────────────────────────────────────────────────────────

export type MeResponse = {
  user: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    phone?: string | null;
    createdAt: string;
  };
  org: {
    id: string;
    name: string;
    status: OrgStatus;
  };
  role: string;
  orgId: string;
};

// ── Org ────────────────────────────────────────────────────────────────────────

export type OrgResponse = {
  id: string;
  name: string;
  status: OrgStatus;
  stripeCustomerId?: string | null;
  subscription?: SubscriptionResponse | null;
  createdAt: string;
  updatedAt: string;
};

export type PatchOrgBody = {
  name: string;
};

// ── Billing / Subscription ───────────────────────────────────────────────────

export type SubscriptionResponse = {
  id: string;
  orgId: string;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
  status: SubscriptionStatus;
  priceId?: string | null;
  planKey?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CheckoutSessionResponse = {
  clientSecret: string;
};

export type ConfirmCheckoutResponse = {
  status: 'active';
  planKey: string;
  role: 'org_admin';
};

export type PortalSessionResponse = {
  url: string;
};

// ── Payments ─────────────────────────────────────────────────────────────────

export type PaymentResponse = {
  id: string;
  orgId: string;
  stripeInvoiceId?: string | null;
  stripeSessionId?: string | null;
  amount: string; // Decimal(12,2) serialized as string
  currency: string;
  status: PaymentStatus;
  paidAt?: string | null;
  createdAt: string;
};

// ── Timeline ─────────────────────────────────────────────────────────────────

export type TimelineEvent = {
  id: string;
  orgId: string;
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

// ── Users / Membership ─────────────────────────────────────────────────────────

export type MemberResponse = {
  id: string;
  userId: string;
  orgId: string;
  /** Lowercase role string matching the contract. */
  role: MemberRole;
  /** Building ids this member is assigned to (supervisor / maintenance). */
  buildingIds: string[];
  username?: string | null;
  user?: {
    id: string;
    email?: string | null;
    fullName?: string | null;
    phone?: string | null;
  } | null;
  createdAt: string;
  enabled?: boolean;
};

export type CreateUserBody = {
  username: string;
  password: string;
  fullName?: string;
  email?: string;
  /** Must be one of the assignable roles. */
  role: AssignableRole;
  /** Building ids to assign (required/useful for supervisor and maintenance). */
  buildingIds?: string[];
};

export type PatchUserBody = {
  role?: AssignableRole;
  buildingIds?: string[];
  enabled?: boolean;
};

// ── Buildings ─────────────────────────────────────────────────────────────────

export type BuildingResponse = {
  id: string;
  orgId: string;
  name: string;
  address?: string | null;
  code?: string | null;
  notes?: string | null;
  createdAt: string;
  /** Keycloak user IDs (`sub`) currently assigned. */
  assignedUserIds: string[];
};

export type CreateBuildingBody = {
  name: string;
  address?: string;
  code?: string;
  notes?: string;
};

export type PatchBuildingBody = {
  name?: string;
  address?: string;
  code?: string;
  notes?: string;
};

export type SetBuildingAssignmentsBody = {
  userIds: string[];
};
