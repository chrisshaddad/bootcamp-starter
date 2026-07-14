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
};

export type PatchRenterBody = {
  fullName?: string;
  email?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  notes?: string;
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
  maintenanceRequestId: string;
  vendorId?: string | null;
  assignedUserId?: string | null;
  status: WorkOrderStatus;
  cost?: string | null; // Decimal(12,2) serialized as string
  resolutionNotes?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

/** GET /maintenance-requests/:id response — MaintenanceRequestResponse plus its full Work Order history. */
export type MaintenanceRequestDetailResponse = MaintenanceRequestResponse & {
  workOrders: WorkOrderResponse[];
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
};

export type PatchWorkOrderBody = {
  vendorId?: string | null;
  assignedUserId?: string | null;
  status?: WorkOrderStatus;
  cost?: number | null;
  resolutionNotes?: string | null;
  completedAt?: string | null;
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
  /** Joined server-side for list-table display; not a stored column. */
  renterName: string;
  /** Joined server-side for list-table display; not a stored column. */
  apartmentUnitNumber: string;
  createdAt: string;
  updatedAt: string;
};
