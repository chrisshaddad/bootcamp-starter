import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@repo/db';
import type {
  InquiryDetailResponse,
  InquiryListQuery,
  InquiryListResponse,
  InquiryResponse,
  InquiryReplyRequest,
  InquiryStatus,
  InquiryStatusUpdateRequest,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { MedicinesService } from '../medicines/medicines.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../audit/audit.constants';

// Every possible status, so tab counts always carry all four keys (0 when a
// status has no inquiries) instead of silently omitting the empty ones.
const ALL_STATUSES: InquiryStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'ANSWERED',
  'CLOSED',
];

// A person's display name, tolerating the odd blank field.
function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

// The tenant predicate applied to every query. A PHARMACY_ADMIN sees the whole
// pharmacy (branchId omitted → all its branches); a branch-bound role (the
// INQUIRY_OFFICER) is pinned to its own branch. `branchId` stays undefined for
// the admin, which Prisma drops from the filter — the pharmacyId still bounds
// the query, so it never becomes unscoped.
interface InquiryScope {
  pharmacyId: string;
  branchId?: string;
}

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly medicines: MedicinesService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Resolve the tenant predicate from the session actor — never the request.
   * Fails closed: a pharmacy-less admin, or a branch-bound role with no branch,
   * gets a Forbidden rather than an accidentally unscoped query.
   */
  private buildScope(actor: User): InquiryScope {
    if (!actor.pharmacyId) {
      throw new ForbiddenException(
        'Your account is not attached to a pharmacy.',
      );
    }
    if (actor.role === 'PHARMACY_ADMIN') {
      return { pharmacyId: actor.pharmacyId };
    }
    // Branch-bound roles (INQUIRY_OFFICER) only ever see their own branch.
    if (!actor.branchId) {
      throw new ForbiddenException('Your account is not attached to a branch.');
    }
    return { pharmacyId: actor.pharmacyId, branchId: actor.branchId };
  }

  /** The caller's inquiry queue, newest activity first, with per-status counts. */
  async list(
    query: InquiryListQuery,
    actor: User,
  ): Promise<InquiryListResponse> {
    const scope = this.buildScope(actor);

    const [rows, grouped, branchName] = await Promise.all([
      this.prisma.inquiry.findMany({
        where: { ...scope, ...(query.status ? { status: query.status } : {}) },
        // `id` is a deterministic tie-breaker so rows keep a stable order when
        // several share an updatedAt timestamp.
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          medicineId: true,
          client: { select: { firstName: true, lastName: true } },
          medicine: { select: { brandName: true } },
          branch: { select: { name: true } },
          _count: { select: { messages: true } },
          // The most recent message drives the officer's notification bell: its
          // sender tells us whether the inquiry is awaiting a reply (CLIENT).
          // The `id` tie-breaker keeps "latest" stable when several messages
          // share a createdAt (otherwise `take: 1` could pick a different one on
          // each poll and make an inquiry flicker in and out of the bell).
          messages: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { senderType: true, createdAt: true },
          },
        },
      }),
      // Counts span the whole queue (ignoring the status filter) so the tab
      // badges stay accurate while one tab is selected.
      this.prisma.inquiry.groupBy({
        by: ['status'],
        where: scope,
        orderBy: { status: 'asc' },
        _count: { _all: true },
      }),
      // A single-branch (officer) view is labelled with its branch name; the
      // admin's cross-branch view has none (each row carries its own).
      this.branchName(scope),
    ]);

    const counts = ALL_STATUSES.reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<InquiryStatus, number>,
    );
    for (const group of grouped) {
      counts[group.status] = group._count._all;
    }

    const inquiries: InquiryResponse[] = rows.map((row) => {
      const lastMessage = row.messages[0] ?? null;
      return {
        id: row.id,
        clientName: fullName(row.client.firstName, row.client.lastName),
        medicineId: row.medicineId,
        medicineName: row.medicine.brandName,
        branchName: row.branch.name,
        status: row.status,
        messageCount: row._count.messages,
        lastUpdatedAt: row.updatedAt,
        lastMessageAt: lastMessage?.createdAt ?? null,
        lastMessageSenderType: lastMessage?.senderType ?? null,
        createdAt: row.createdAt,
      };
    });

    return {
      branchName,
      inquiries,
      total: inquiries.length,
      counts,
    };
  }

  /** Full thread + context panel for one inquiry the caller may access. */
  async detail(id: string, actor: User): Promise<InquiryDetailResponse> {
    return this.buildDetail(id, this.buildScope(actor));
  }

  /**
   * Post an officer/admin reply. Creating the message, auto-advancing the
   * inquiry to IN_PROGRESS, and writing the audit entry all run in ONE
   * interactive transaction, so a partial failure can never leave a saved reply
   * without the status change or the audit record (Package C rule). The audit
   * row is written with the transaction client here rather than via
   * AuditService.record (which is best-effort/after-commit) precisely so it
   * shares this atomicity.
   */
  async reply(
    id: string,
    dto: InquiryReplyRequest,
    actor: User,
  ): Promise<InquiryDetailResponse> {
    const scope = this.buildScope(actor);

    // Confirm the inquiry is in the caller's scope before writing. A miss is a
    // 404 (never leaking that an inquiry exists in another tenant).
    const inquiry = await this.prisma.inquiry.findFirst({
      where: { id, ...scope },
      select: { id: true, status: true },
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inquiryMessage.create({
        data: {
          inquiryId: id,
          senderId: actor.id,
          senderType: 'EMPLOYEE',
          message: dto.message,
        },
      });
      // A reply always moves the conversation into IN_PROGRESS (re-opening an
      // ANSWERED/CLOSED thread the client followed up on). @updatedAt bumps the
      // queue ordering. Scope the write by the tenant predicate too, not just id.
      await tx.inquiry.updateMany({
        where: { id, ...scope },
        data: { status: 'IN_PROGRESS' },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: AUDIT_ACTIONS.INQUIRY_REPLY,
          entity: AUDIT_ENTITIES.INQUIRY,
          entityId: id,
          details: {
            statusFrom: inquiry.status,
            statusTo: 'IN_PROGRESS',
          },
        },
      });
    });

    return this.buildDetail(id, scope);
  }

  /** Change an inquiry's status (+ audit the transition). */
  async updateStatus(
    id: string,
    dto: InquiryStatusUpdateRequest,
    actor: User,
  ): Promise<InquiryDetailResponse> {
    const scope = this.buildScope(actor);

    const inquiry = await this.prisma.inquiry.findFirst({
      where: { id, ...scope },
      select: { id: true, status: true },
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found.');
    }

    if (dto.status !== inquiry.status) {
      // Scope the mutation by the tenant predicate, so the boundary is enforced
      // on the write — not just the findFirst check above.
      await this.prisma.inquiry.updateMany({
        where: { id, ...scope },
        data: { status: dto.status },
      });
      await this.audit.record({
        userId: actor.id,
        action: AUDIT_ACTIONS.INQUIRY_STATUS_CHANGE,
        entity: AUDIT_ENTITIES.INQUIRY,
        entityId: id,
        details: {
          changes: { status: { from: inquiry.status, to: dto.status } },
        },
      });
    }

    return this.buildDetail(id, scope);
  }

  /** Assemble the detail payload (thread + client + medicine + branch stock). */
  private async buildDetail(
    id: string,
    scope: InquiryScope,
  ): Promise<InquiryDetailResponse> {
    const inquiry = await this.prisma.inquiry.findFirst({
      where: { id, ...scope },
      select: {
        id: true,
        status: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        medicineId: true,
        branch: { select: { name: true } },
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
        messages: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            senderType: true,
            message: true,
            createdAt: true,
            sender: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found.');
    }

    // Pull the full catalog record (every displayable field, via the shared
    // MedicinesService mapping) and this medicine's live inventory at the
    // inquiry's branch, in parallel. Both are read fresh on every request, so a
    // catalog edit or a new stock batch shows up as soon as the client refetches.
    const [medicine, stock] = await Promise.all([
      this.medicines.getById(inquiry.medicineId),
      this.prisma.stockBatch.aggregate({
        where: { branchId: inquiry.branchId, medicineId: inquiry.medicineId },
        _sum: { quantity: true },
        _count: { _all: true },
        _min: { expiryDate: true },
      }),
    ]);
    if (!medicine) {
      throw new NotFoundException('Medicine not found.');
    }

    return {
      id: inquiry.id,
      status: inquiry.status,
      branchName: inquiry.branch.name,
      createdAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt,
      client: {
        id: inquiry.client.id,
        name: fullName(inquiry.client.firstName, inquiry.client.lastName),
        email: inquiry.client.email,
        phoneNumber: inquiry.client.phoneNumber,
      },
      medicine,
      stock: {
        totalQuantity: stock._sum.quantity ?? 0,
        batchCount: stock._count._all,
        nearestExpiry: stock._min.expiryDate ?? null,
      },
      messages: inquiry.messages.map((message) => ({
        id: message.id,
        senderType: message.senderType,
        senderName: message.sender
          ? fullName(message.sender.firstName, message.sender.lastName)
          : null,
        message: message.message,
        createdAt: message.createdAt,
      })),
    };
  }

  /**
   * The branch label for a single-branch (officer) queue, or null for the
   * admin's cross-branch view. Scoped by pharmacyId so it upholds tenant
   * isolation.
   */
  private async branchName(scope: InquiryScope): Promise<string | null> {
    if (!scope.branchId) return null;
    const branch = await this.prisma.pharmacyBranch.findFirst({
      where: { id: scope.branchId, pharmacyId: scope.pharmacyId },
      select: { name: true },
    });
    return branch?.name ?? null;
  }
}
