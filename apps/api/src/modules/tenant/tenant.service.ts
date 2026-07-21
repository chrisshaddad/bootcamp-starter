import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { LeaseStatusService } from '@/common/lease-status/lease-status.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { computeInvoiceSummary } from '@/common/invoice-summary/compute-invoice-summary';
import type {
  InvoiceStatus,
  LeaseStatus,
  MaintenanceRequestPriority,
  MaintenanceRequestStatus,
  TenantInvoiceView,
  TenantLeaseView,
  TenantMaintenanceRequestView,
  TenantOverviewResponse,
} from '@repo/contracts';
import { CreateTenantMaintenanceRequestDto } from './dto/create-tenant-maintenance-request.dto';

type DecimalLike = { toNumber(): number };

type LeaseRow = {
  id: string;
  buildingId: string;
  startDate: Date;
  endDate: Date;
  rentAmount: DecimalLike;
  depositAmount: DecimalLike;
  status: string;
  apartment: { unitNumber: string; building: { name: string } };
};

type InvoiceRow = {
  id: string;
  dueDate: Date;
  lineItems: { amount: DecimalLike }[];
  payments: { amount: DecimalLike }[];
};

type RequestRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  createdAt: Date;
  apartment: { unitNumber: string };
};

/**
 * Tenant self-service. Every method resolves the caller's linked Renter row via
 * `Renter.renterUserId == userId` (the Keycloak `sub`) and derives ALL scope
 * from it — no id is ever accepted from the client, so one tenant can never
 * reach another's lease, invoices, or requests. Monetary values are derived
 * through {@link computeInvoiceSummary} (the same helper Invoices/Reports use)
 * so the numbers reconcile, and are serialized as fixed(2) strings.
 */
@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaseStatus: LeaseStatusService,
    private readonly timeline: TimelineService,
  ) {}

  private money(value: number): string {
    return value.toFixed(2);
  }

  private emptyOverview(): TenantOverviewResponse {
    return {
      linked: false,
      renter: null,
      lease: null,
      leaseHistory: [],
      balance: { invoiced: '0.00', paid: '0.00', outstanding: '0.00' },
      invoices: [],
      maintenanceRequests: [],
    };
  }

  private formatLease(lease: LeaseRow, now: Date): TenantLeaseView {
    return {
      id: lease.id,
      buildingId: lease.buildingId,
      buildingName: lease.apartment.building.name,
      unitNumber: lease.apartment.unitNumber,
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate.toISOString(),
      rentAmount: this.money(lease.rentAmount.toNumber()),
      depositAmount: this.money(lease.depositAmount.toNumber()),
      status: lease.status as LeaseStatus,
      effectiveStatus: this.leaseStatus.deriveEffectiveStatus(
        { status: lease.status as LeaseStatus, endDate: lease.endDate },
        now,
      ),
    };
  }

  private formatRequest(request: RequestRow): TenantMaintenanceRequestView {
    return {
      id: request.id,
      title: request.title,
      description: request.description,
      status: request.status as MaintenanceRequestStatus,
      priority: request.priority as MaintenanceRequestPriority,
      unitNumber: request.apartment.unitNumber,
      createdAt: request.createdAt.toISOString(),
    };
  }

  /** Resolve the Renter linked to this Keycloak user within the org, or null. */
  private async findLinkedRenter(orgId: string, userId: string) {
    return this.prisma.renter.findFirst({
      where: { orgId, renterUserId: userId },
      select: { id: true, fullName: true, email: true, phone: true },
    });
  }

  /**
   * Of the tenant's leases, the one to surface as "my lease": the first
   * effectively-active lease (newest start), else the most recent lease.
   */
  private pickCurrentLease<T extends { status: string; endDate: Date }>(
    leases: T[],
    now: Date,
  ): T | null {
    const active = leases.find((l) =>
      this.leaseStatus.isEffectivelyActive(
        { status: l.status as LeaseStatus, endDate: l.endDate },
        now,
      ),
    );
    return active ?? leases[0] ?? null;
  }

  async getOverview(
    orgId: string,
    userId: string,
    now: Date = new Date(),
  ): Promise<{ data: TenantOverviewResponse }> {
    const renter = await this.findLinkedRenter(orgId, userId);
    if (!renter) {
      return { data: this.emptyOverview() };
    }

    const [leases, invoices, requests] = await Promise.all([
      this.prisma.lease.findMany({
        where: { orgId, renterId: renter.id },
        select: {
          id: true,
          buildingId: true,
          startDate: true,
          endDate: true,
          rentAmount: true,
          depositAmount: true,
          status: true,
          apartment: {
            select: {
              unitNumber: true,
              building: { select: { name: true } },
            },
          },
        },
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.invoice.findMany({
        where: { orgId, lease: { renterId: renter.id } },
        select: {
          id: true,
          dueDate: true,
          lineItems: { select: { amount: true } },
          payments: { select: { amount: true } },
        },
        orderBy: { dueDate: 'desc' },
      }),
      this.prisma.maintenanceRequest.findMany({
        where: { orgId, renterId: renter.id },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          createdAt: true,
          apartment: { select: { unitNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const current = this.pickCurrentLease(leases as LeaseRow[], now);

    // Balance spans ALL of the tenant's invoices; the list shows the latest 10.
    let totalInvoiced = 0;
    let totalPaid = 0;
    const invoiceViews: TenantInvoiceView[] = (invoices as InvoiceRow[]).map(
      (inv) => {
        const { totalAmount, paidAmount, status } = computeInvoiceSummary(
          inv.lineItems.map((li) => ({ amount: li.amount.toNumber() })),
          inv.payments.map((p) => ({ amount: p.amount.toNumber() })),
          inv.dueDate,
          now,
        );
        totalInvoiced += totalAmount;
        totalPaid += paidAmount;
        return {
          id: inv.id,
          dueDate: inv.dueDate.toISOString(),
          invoiced: this.money(totalAmount),
          paid: this.money(paidAmount),
          balance: this.money(totalAmount - paidAmount),
          status: status as InvoiceStatus,
        };
      },
    );

    return {
      data: {
        linked: true,
        renter: {
          id: renter.id,
          fullName: renter.fullName,
          email: renter.email,
          phone: renter.phone,
        },
        lease: current ? this.formatLease(current, now) : null,
        // Full lease history for the portal (TP3) — same per-lease formatter as
        // `lease`, applied to every lease the tenant has ever held, newest first
        // (leases were already fetched ordered by startDate desc).
        leaseHistory: (leases as LeaseRow[]).map((l) =>
          this.formatLease(l, now),
        ),
        balance: {
          invoiced: this.money(totalInvoiced),
          paid: this.money(totalPaid),
          outstanding: this.money(totalInvoiced - totalPaid),
        },
        invoices: invoiceViews.slice(0, 10),
        maintenanceRequests: (requests as RequestRow[]).map((r) =>
          this.formatRequest(r),
        ),
      },
    };
  }

  async createMaintenanceRequest(
    orgId: string,
    userId: string,
    dto: CreateTenantMaintenanceRequestDto,
    now: Date = new Date(),
  ): Promise<{ data: TenantMaintenanceRequestView }> {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('A title is required.');
    }

    const renter = await this.findLinkedRenter(orgId, userId);
    if (!renter) {
      throw new ForbiddenException(
        'Your tenant account is not linked to a lease yet. Contact your property manager.',
      );
    }

    const leases = await this.prisma.lease.findMany({
      where: { orgId, renterId: renter.id },
      select: {
        id: true,
        buildingId: true,
        apartmentId: true,
        status: true,
        endDate: true,
      },
      orderBy: { startDate: 'desc' },
    });
    const current = this.pickCurrentLease(leases, now);
    // Only an effectively-active lease can receive a request — a past/expired
    // lease is not a place to raise new issues, and a tenant with no active
    // lease has no apartment to scope to.
    if (
      !current ||
      !this.leaseStatus.isEffectivelyActive(
        { status: current.status as LeaseStatus, endDate: current.endDate },
        now,
      )
    ) {
      throw new BadRequestException(
        'You have no active lease to attach a maintenance request to.',
      );
    }

    const created = await this.prisma.maintenanceRequest.create({
      data: {
        orgId,
        buildingId: current.buildingId,
        apartmentId: current.apartmentId,
        renterId: renter.id,
        title: dto.title.trim(),
        description: dto.description,
        ...(dto.priority && { priority: dto.priority }),
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        createdAt: true,
        apartment: { select: { unitNumber: true } },
      },
    });

    await this.timeline.emit({
      orgId,
      actorId: userId,
      action: 'maintenance_request.created',
      targetType: 'MaintenanceRequest',
      targetId: created.id,
      metadata: {
        title: created.title,
        apartmentId: current.apartmentId,
        viaTenantPortal: true,
      },
    });

    return { data: this.formatRequest(created as RequestRow) };
  }
}
