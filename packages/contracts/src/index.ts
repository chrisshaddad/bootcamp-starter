import { z } from 'zod';

/**
 * @repo/contracts — the single source of truth for the HTTP API contract
 * shared between the NestJS backend (property-manager-be) and the Next.js client
 * (property-manager-fe). Enums are zod schemas (runtime-checkable); response/body
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

/**
 * Paginated list envelope. The array field is `items` (NOT `data`) — this must
 * match the backend list services (payments.service, timeline.service) exactly,
 * or FE consumers reading the array get an empty list. Do not rename to `data`:
 * the `unwrap` transform on the client keys on a top-level `data` property to
 * peel the optional ApiEnvelope, so a `data` array here would be mis-unwrapped.
 */
export type PaginatedResponse<T> = {
  items: T[];
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

export const apartmentStatusSchema = z.enum([
  'vacant',
  'occupied',
  'maintenance',
  'unavailable',
]);
export type ApartmentStatus = z.infer<typeof apartmentStatusSchema>;

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
  updatedAt: string;
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

// ── Floors ───────────────────────────────────────────────────────────────────

export type FloorResponse = {
  id: string;
  orgId: string;
  buildingId: string;
  name: string;
  order: number;
  notes?: string | null;
  apartmentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateFloorBody = {
  name: string;
  notes?: string;
};

export type PatchFloorBody = {
  name?: string;
  order?: number;
  notes?: string;
};

// ── Apartments ───────────────────────────────────────────────────────────────

export type ApartmentResponse = {
  id: string;
  orgId: string;
  buildingId: string;
  floorId: string;
  unitNumber: string;
  bedrooms: number;
  bathrooms: string; // Decimal(3,1) serialized as string
  sqft?: number | null;
  status: ApartmentStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateApartmentBody = {
  unitNumber: string;
  bedrooms: number;
  bathrooms: number;
  sqft?: number;
  status?: ApartmentStatus;
  notes?: string;
};

export type PatchApartmentBody = {
  unitNumber?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  status?: ApartmentStatus;
  notes?: string;
};

// ── Renters ──────────────────────────────────────────────────────────────────

export const renterEffectiveStatusSchema = z.enum([
  'current',
  'former',
  'none',
]);
export type RenterEffectiveStatus = z.infer<typeof renterEffectiveStatusSchema>;

export type RenterResponse = {
  id: string;
  orgId: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  /**
   * Keycloak `sub` of the tenant user linked to this renter, if any. Setting it
   * is what gives a tenant a self-service portal (Sprint T1). Only ever visible
   * to org staff — tenants cannot read the renters endpoints.
   */
  renterUserId?: string | null;
  /** Derived from the renter's most recent lease via LeaseStatusService. */
  effectiveStatus: RenterEffectiveStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateRenterBody = {
  fullName: string;
  email?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  /** Keycloak `sub` of the tenant user to link (enables their portal). */
  renterUserId?: string | null;
};

export type PatchRenterBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
  /** Set/clear the linked tenant user (Keycloak `sub`). */
  renterUserId?: string | null;
};

/** GET /renters/:id response — RenterResponse plus full lease history. */
export type RenterDetailResponse = RenterResponse & {
  leases: LeaseResponse[];
};

// ── Leases ───────────────────────────────────────────────────────────────────

export const leaseStatusSchema = z.enum([
  'draft',
  'active',
  'expired',
  'terminated',
]);
export type LeaseStatus = z.infer<typeof leaseStatusSchema>;

export type LeaseResponse = {
  id: string;
  orgId: string;
  buildingId: string;
  floorId: string;
  apartmentId: string;
  renterId: string;
  startDate: string;
  endDate: string;
  rentAmount: string; // Decimal(12,2) serialized as string
  depositAmount: string; // Decimal(12,2) serialized as string
  /** Raw stored status. */
  status: LeaseStatus;
  /** Derived via LeaseStatusService (e.g. 'active' + past endDate -> 'expired'). */
  effectiveStatus: LeaseStatus;
  renewalTerms?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * GET /leases (org-wide overview) — one row per lease across the whole org,
 * enriched with display names so the FE can render a flat table without
 * additional lookups. Missing relations fall back to '' rather than throwing.
 */
export type LeaseListRow = LeaseResponse & {
  buildingName: string;
  floorName: string;
  unitNumber: string;
  renterName: string;
};

export type CreateLeaseBody = {
  renterId: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  depositAmount: number;
  /** Defaults to 'active' when omitted. */
  status?: LeaseStatus;
  renewalTerms?: string;
  notes?: string;
};

export type PatchLeaseBody = {
  renterId?: string;
  startDate?: string;
  endDate?: string;
  rentAmount?: number;
  depositAmount?: number;
  status?: LeaseStatus;
  renewalTerms?: string;
  notes?: string;
};

/**
 * Renter and apartment are implicit from the existing lease/route being
 * renewed — not overridable here.
 */
export type RenewLeaseBody = {
  startDate: string;
  endDate: string;
  rentAmount?: number;
  depositAmount?: number;
  renewalTerms?: string;
  notes?: string;
};

// ── Vendors ──────────────────────────────────────────────────────────────────

export const vendorServiceTypeSchema = z.enum([
  'plumbing',
  'electrical',
  'cleaning',
  'landscaping',
  'hvac',
  'general_maintenance',
  'other',
]);
export type VendorServiceType = z.infer<typeof vendorServiceTypeSchema>;

export type VendorResponse = {
  id: string;
  orgId: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  servicesOffered: VendorServiceType[];
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateVendorBody = {
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  servicesOffered?: VendorServiceType[];
  notes?: string;
};

export type PatchVendorBody = {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  servicesOffered?: VendorServiceType[];
  notes?: string;
};

// ── Maintenance Requests ─────────────────────────────────────────────────────

export const maintenanceRequestStatusSchema = z.enum([
  'open',
  'in_progress',
  'resolved',
  'closed',
]);
export type MaintenanceRequestStatus = z.infer<
  typeof maintenanceRequestStatusSchema
>;

export const maintenanceRequestPrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'urgent',
]);
export type MaintenanceRequestPriority = z.infer<
  typeof maintenanceRequestPrioritySchema
>;

export type MaintenanceRequestResponse = {
  id: string;
  orgId: string;
  buildingId: string;
  apartmentId: string;
  renterId: string;
  title: string;
  description?: string | null;
  status: MaintenanceRequestStatus;
  priority: MaintenanceRequestPriority;
  notes?: string | null;
  /** Joined server-side for list-table display; not a stored column. */
  apartmentUnitNumber: string;
  /** Joined server-side for list-table display; not a stored column. */
  renterName: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateMaintenanceRequestBody = {
  buildingId: string;
  apartmentId: string;
  renterId: string;
  title: string;
  description?: string;
  /** Defaults to 'open' when omitted. */
  status?: MaintenanceRequestStatus;
  /** Defaults to 'medium' when omitted. */
  priority?: MaintenanceRequestPriority;
  notes?: string;
};

export type PatchMaintenanceRequestBody = {
  buildingId?: string;
  apartmentId?: string;
  renterId?: string;
  title?: string;
  description?: string;
  status?: MaintenanceRequestStatus;
  priority?: MaintenanceRequestPriority;
  notes?: string;
};

// ── Work Orders ──────────────────────────────────────────────────────────────

export const workOrderStatusSchema = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'canceled',
]);
export type WorkOrderStatus = z.infer<typeof workOrderStatusSchema>;

export type WorkOrderResponse = {
  id: string;
  orgId: string;
  /** Org-scoped sequential number (raw integer). */
  number: number;
  /** Pre-formatted display label, e.g. `WO-000123`. */
  numberLabel: string;
  maintenanceRequestId: string;
  vendorId?: string | null;
  assignedUserId?: string | null;
  status: WorkOrderStatus;
  cost?: string | null; // Decimal(12,2) serialized as string
  resolutionNotes?: string | null;
  completedAt?: string | null;
  /** Opt-in: bill this work order to the tenant on completion (F3.2, default false). */
  chargeToTenant: boolean;
  /** Amount to charge the tenant (Decimal(12,2) as string), when chargeToTenant. */
  tenantChargeAmount?: string | null;
  /** When the tenant charge was applied to an invoice (idempotency guard); null = not yet. */
  tenantChargedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Canonical work-order number formatter used on both the API and the web app so
 * `WO-000123` renders identically everywhere a work order is referenced.
 */
export function formatWorkOrderNumber(n: number): string {
  return `WO-${String(n).padStart(6, '0')}`;
}

/** GET /maintenance-requests/:id response — MaintenanceRequestResponse plus its full Work Order history. */
export type MaintenanceRequestDetailResponse = MaintenanceRequestResponse & {
  workOrders: WorkOrderResponse[];
};

/**
 * A work order assigned to the calling user, enriched with the parent request /
 * apartment / building context so it can be surfaced as a standalone "My work
 * orders" list (GET /work-orders/assigned-to-me) without drilling into a request.
 */
export type AssignedWorkOrderRow = WorkOrderResponse & {
  requestTitle: string;
  requestStatus: MaintenanceRequestStatus;
  buildingId: string;
  buildingName: string;
  apartmentId: string;
  apartmentUnit: string;
};

export type AssignedWorkOrderListResponse = {
  data: AssignedWorkOrderRow[];
};

/**
 * maintenanceRequestId is implicit from the nested route (not part of the
 * body), matching the CreateLeaseBody precedent for apartmentId/floorId/
 * buildingId. Exactly one of vendorId/assignedUserId is required — enforced
 * in WorkOrdersService, not here.
 */
export type CreateWorkOrderBody = {
  vendorId?: string;
  assignedUserId?: string;
  status?: WorkOrderStatus;
  cost?: number;
  resolutionNotes?: string;
  chargeToTenant?: boolean;
  tenantChargeAmount?: number | null;
};

export type PatchWorkOrderBody = {
  vendorId?: string | null;
  assignedUserId?: string | null;
  status?: WorkOrderStatus;
  cost?: number | null;
  resolutionNotes?: string | null;
  completedAt?: string | null;
  chargeToTenant?: boolean;
  tenantChargeAmount?: number | null;
};

/**
 * Result of a recurring-invoice generation run (F3.1). The scheduled daily job
 * and the manual "generate now" trigger both return this shape.
 */
export type RecurringInvoiceRunResponse = {
  generated: number; // invoices created this run
  leasesConsidered: number; // active leases inspected
  skippedExisting: number; // periods that already had an invoice (idempotent no-op)
};

// ── Expenses ─────────────────────────────────────────────────────────────────

export const expenseCategorySchema = z.enum([
  'repairs',
  'vendor_payment',
  'utilities',
  'taxes',
  'insurance',
  'other',
]);
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

export type ExpenseResponse = {
  id: string;
  orgId: string;
  buildingId?: string | null;
  vendorId?: string | null;
  workOrderId?: string | null;
  /** Pre-formatted `WO-000123` for the linked work order, if any (display). */
  workOrderNumberLabel?: string | null;
  category: ExpenseCategory;
  amount: string; // Decimal(12,2) serialized as string
  incurredAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * buildingId/vendorId/workOrderId/notes are optional. If workOrderId is
 * provided and vendorId is omitted, vendorId is auto-filled from that Work
 * Order's own vendorId — enforced in ExpensesService, not here.
 */
export type CreateExpenseBody = {
  category: ExpenseCategory;
  amount: number;
  incurredAt: string;
  buildingId?: string;
  vendorId?: string;
  workOrderId?: string;
  notes?: string;
};

export type PatchExpenseBody = {
  category?: ExpenseCategory;
  amount?: number;
  incurredAt?: string;
  buildingId?: string | null;
  vendorId?: string | null;
  workOrderId?: string | null;
  notes?: string | null;
};

// ── Invoices ─────────────────────────────────────────────────────────────────

export const invoiceLineItemCategorySchema = z.enum([
  'rent',
  'late_fee',
  'utilities',
  'damages',
  'deposit',
  'other',
]);
export type InvoiceLineItemCategory = z.infer<
  typeof invoiceLineItemCategorySchema
>;

/** Always derived via computeInvoiceSummary — never stored/accepted as input. */
export const invoiceStatusSchema = z.enum([
  'open',
  'partially_paid',
  'paid',
  'overdue',
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export type InvoiceLineItemResponse = {
  id: string;
  invoiceId: string;
  category: InvoiceLineItemCategory;
  description?: string | null;
  amount: string; // Decimal(12,2) serialized as string
  createdAt: string;
  updatedAt: string;
};

export type InvoiceResponse = {
  id: string;
  orgId: string;
  /** Denormalized from Lease.buildingId at creation time. */
  buildingId: string;
  leaseId: string;
  dueDate: string;
  notes?: string | null;
  lineItems: InvoiceLineItemResponse[];
  /** Computed via computeInvoiceSummary from lineItems + payments; never stored. */
  totalAmount: string;
  paidAmount: string;
  status: InvoiceStatus;
  /** Denormalized from Lease.renterId; links this invoice to its renter profile. */
  renterId: string;
  /** Joined server-side for list-table display; not a stored column. */
  renterName: string;
  /** Joined server-side for list-table display; not a stored column. */
  apartmentUnitNumber: string;
  createdAt: string;
  updatedAt: string;
};

export type InvoiceLineItemInput = {
  category: InvoiceLineItemCategory;
  description?: string;
  amount: number;
};

/**
 * At least one line item is required. buildingId is derived server-side from
 * the lease, never accepted as input.
 */
export type CreateInvoiceBody = {
  leaseId: string;
  dueDate: string;
  notes?: string;
  lineItems: InvoiceLineItemInput[];
};

/**
 * When lineItems is provided, the full desired set is replaced wholesale
 * (delete-then-recreate) — not diffed individually. Omit it to patch
 * dueDate/notes only.
 */
export type PatchInvoiceBody = {
  dueDate?: string;
  notes?: string | null;
  lineItems?: InvoiceLineItemInput[];
};

// ── Invoice Payments ─────────────────────────────────────────────────────────

/**
 * Named InvoicePayment (not Payment) — Payment already means the platform's
 * own Stripe subscription billing, an unrelated concern.
 */
export const invoicePaymentMethodSchema = z.enum([
  'cash',
  'check',
  'bank_transfer',
  'card',
  'other',
]);
export type InvoicePaymentMethod = z.infer<typeof invoicePaymentMethodSchema>;

export type InvoicePaymentResponse = {
  id: string;
  orgId: string;
  invoiceId: string;
  amount: string; // Decimal(12,2) serialized as string
  method: InvoicePaymentMethod;
  paidAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateInvoicePaymentBody = {
  invoiceId: string;
  amount: number;
  method: InvoicePaymentMethod;
  paidAt: string;
  notes?: string;
};

/** Recomputed via computeInvoiceSummary — returned so the UI can reflect the new state without a separate refetch. */
export type InvoiceSummarySnapshot = {
  totalAmount: string;
  paidAmount: string;
  status: InvoiceStatus;
};

export type CreateInvoicePaymentResult = {
  payment: InvoicePaymentResponse;
  invoice: InvoiceSummarySnapshot;
};

export type DeleteInvoicePaymentResult = {
  id: string;
  invoice: InvoiceSummarySnapshot;
};

// ── Support Tickets ───────────────────────────────────────────────────────────
// A tenant (or any user) opens a support request. There is no threaded chat: the
// platform acknowledges receipt, the opener gets an acknowledgment notification,
// and staff can later move the ticket to resolved/closed.

export const supportTicketCategorySchema = z.enum([
  'general',
  'billing',
  'maintenance',
  'technical',
  'other',
]);
export type SupportTicketCategory = z.infer<typeof supportTicketCategorySchema>;

export const supportTicketStatusSchema = z.enum([
  'open',
  'acknowledged',
  'resolved',
  'closed',
]);
export type SupportTicketStatus = z.infer<typeof supportTicketStatusSchema>;

export type SupportTicketResponse = {
  id: string;
  orgId: string;
  /** Keycloak `sub` of the user who opened the ticket. */
  createdByUserId: string;
  subject: string;
  description: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  acknowledgedAt?: string | null;
  acknowledgedByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateSupportTicketBody = {
  subject: string;
  description: string;
  category?: SupportTicketCategory;
};

/** Staff-only transition (acknowledge/resolve/close). Tenants cannot patch. */
export type PatchSupportTicketBody = {
  status?: SupportTicketStatus;
};

// ── Notifications ─────────────────────────────────────────────────────────────
// Delivered asynchronously via the BullMQ `notifications` queue and persisted for
// in-app display. Scoped to a single recipient (Keycloak `sub`).

export type NotificationResponse = {
  id: string;
  orgId: string;
  userId: string;
  /** Machine key, e.g. 'support_ticket.acknowledged'. */
  type: string;
  title: string;
  body?: string | null;
  data: Record<string, unknown>;
  readAt?: string | null;
  createdAt: string;
};

/** GET /notifications — list + the caller's current unread count in one round-trip. */
export type NotificationListResponse = {
  data: NotificationResponse[];
  unreadCount: number;
};

export type UnreadCountResponse = {
  unreadCount: number;
};

// ── Reports ─────────────────────────────────────────────────────────────────
// Read-only, org-scoped aggregates computed from existing tables (leases,
// apartments, invoices/line-items/payments, expenses). Only org_admin + finance
// may read these (see permissions matrix `reports` area). All monetary values
// are Decimal(12,2) serialized as strings, consistent with the Invoices module.

/**
 * A financial window's income/expenses/net. Used for the optional custom
 * date-range on the summary endpoint. `income` = sum of InvoicePayment.amount
 * with paidAt in [from,to]; `expenses` = sum of Expense.amount with incurredAt
 * in [from,to]; `net` = income − expenses.
 */
export type ReportRange = {
  from: string;
  to: string;
  income: string;
  expenses: string;
  net: string;
};

/**
 * GET /reports/summary — headline KPIs for the org.
 * - `activeLeases`: leases effectively active now (status 'active' & endDate in
 *   the future), matching LeaseStatusService.isEffectivelyActive.
 * - occupancy: `occupiedApartments` / `totalApartments` (× 100 → `occupancyPct`,
 *   0–100 with 1 decimal; 0 when there are no apartments).
 * - MTD/YTD income & expenses are always relative to "now"; `net` = income −
 *   expenses. `range` is non-null only when `from`/`to` query params are passed.
 */
export type ReportSummary = {
  activeLeases: number;
  totalApartments: number;
  occupiedApartments: number;
  occupancyPct: number;
  mtdIncome: string;
  ytdIncome: string;
  mtdExpenses: string;
  ytdExpenses: string;
  mtdNet: string;
  ytdNet: string;
  range: ReportRange | null;
};

/**
 * GET /reports/rent-roll — one row per effectively-active lease. `invoiced` and
 * `paid` are lifetime totals across the lease's invoices (via
 * computeInvoiceSummary, the same derivation the Invoices module uses, so the
 * numbers reconcile); `balance` = invoiced − paid.
 */
export type RentRollRow = {
  leaseId: string;
  unitNumber: string;
  renterName: string;
  rent: string;
  invoiced: string;
  paid: string;
  balance: string;
};

/**
 * GET /reports/overdue — invoices past `dueDate` with an outstanding balance
 * (i.e. computeInvoiceSummary status === 'overdue'), as of "now" or the optional
 * `asOf` query param. `daysOverdue` = whole days between dueDate and the as-of.
 */
export type OverdueInvoiceRow = {
  invoiceId: string;
  unitNumber: string;
  renterName: string;
  dueDate: string;
  invoiced: string;
  paid: string;
  balance: string;
  daysOverdue: number;
};

// ── Tenant self-service (Sprint T1) ──────────────────────────────────────────
// The tenant portal. A `tenant`-role user is linked to a Renter row via
// Renter.renterUserId == the caller's Keycloak `sub`. Everything below is
// derived from that `sub` server-side — there is NO id the caller can pass to
// reach another tenant's data, so cross-tenant isolation is structural. Monetary
// values are Decimal(12,2) serialized as strings, consistent with Invoices.

/** The tenant's current (or most recent) lease, flattened for the portal. */
export type TenantLeaseView = {
  id: string;
  buildingId: string;
  buildingName: string;
  unitNumber: string;
  startDate: string;
  endDate: string;
  rentAmount: string;
  depositAmount: string;
  /** Raw stored status. */
  status: LeaseStatus;
  /** Derived via LeaseStatusService (e.g. 'active' + past endDate -> 'expired'). */
  effectiveStatus: LeaseStatus;
};

/**
 * One invoice belonging to the tenant's lease(s). `invoiced`/`paid`/`status`
 * come from computeInvoiceSummary (the same derivation the Invoices module
 * uses); `balance` = invoiced − paid.
 */
export type TenantInvoiceView = {
  id: string;
  dueDate: string;
  invoiced: string;
  paid: string;
  balance: string;
  status: InvoiceStatus;
};

/** A maintenance request the tenant raised (or that was raised for them). */
export type TenantMaintenanceRequestView = {
  id: string;
  title: string;
  description?: string | null;
  status: MaintenanceRequestStatus;
  priority: MaintenanceRequestPriority;
  unitNumber: string;
  createdAt: string;
};

/** Lifetime balance across all of the tenant's invoices. */
export type TenantBalance = {
  invoiced: string;
  paid: string;
  outstanding: string;
};

/**
 * GET /tenant/overview — everything a logged-in tenant can see about themselves.
 * `linked` is false when no Renter is bound to the caller's `sub` yet: the FE
 * then shows a "not linked" empty state rather than an error. When false, the
 * renter/lease are null and the lists are empty.
 */
export type TenantOverviewResponse = {
  linked: boolean;
  renter: {
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
  } | null;
  lease: TenantLeaseView | null;
  balance: TenantBalance;
  /** Latest invoices for the tenant's lease(s), newest dueDate first. */
  invoices: TenantInvoiceView[];
  /** The tenant's maintenance requests, newest first. */
  maintenanceRequests: TenantMaintenanceRequestView[];
};

/**
 * POST /tenant/maintenance-requests — a tenant opens a request for their own
 * apartment. buildingId/apartmentId/renterId are all derived server-side from
 * the caller's active lease; the tenant cannot target another unit. `status`
 * is always 'open'.
 */
export type CreateTenantMaintenanceRequestBody = {
  title: string;
  description?: string;
  /** Defaults to 'medium' when omitted. */
  priority?: MaintenanceRequestPriority;
};
