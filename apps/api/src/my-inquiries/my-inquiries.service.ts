import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@repo/db';
import type {
  ClientInquiryCreateRequest,
  ClientInquiryDetailResponse,
  ClientInquiryListResponse,
  ClientInquiryStatusRequest,
  InquiryReplyRequest,
  InquiryStatus,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { MedicinesService } from '../medicines/medicines.service';
import { AuditService } from '../audit/audit.service';
import { AUDIT_ACTIONS, AUDIT_ENTITIES } from '../audit/audit.constants';

// Every status, so the list's tab counts always carry all four keys (0 when a
// status is empty) instead of silently omitting them.
const ALL_STATUSES: InquiryStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'ANSWERED',
  'CLOSED',
];

function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

/**
 * The CLIENT side of inquiries — a consumer asks a pharmacy about a medicine and
 * tracks the conversation. Reads the same Inquiry/InquiryMessage tables as the
 * staff slice, but every query is scoped to the session client (`actor.id` as
 * `clientId`); a client only ever sees their own inquiries.
 */
@Injectable()
export class MyInquiriesService {
  private readonly logger = new Logger(MyInquiriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly medicines: MedicinesService,
    private readonly audit: AuditService,
  ) {}

  /** The caller's own inquiries, newest activity first, with per-status counts. */
  async list(
    status: InquiryStatus | undefined,
    actor: User,
  ): Promise<ClientInquiryListResponse> {
    const clientId = actor.id;

    const [rows, grouped] = await Promise.all([
      this.prisma.inquiry.findMany({
        where: { clientId, ...(status ? { status } : {}) },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          medicineId: true,
          pharmacy: { select: { name: true } },
          medicine: { select: { brandName: true } },
          branch: { select: { name: true } },
          _count: { select: { messages: true } },
          // Latest message → whether the pharmacy answered last (a reply the
          // client may not have opened). Deterministic id tie-breaker.
          messages: {
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 1,
            select: { senderType: true, createdAt: true },
          },
        },
      }),
      // Counts span the whole set (ignoring the status filter) so tabs stay
      // accurate while one is selected.
      this.prisma.inquiry.groupBy({
        by: ['status'],
        where: { clientId },
        _count: { _all: true },
      }),
    ]);

    const counts = ALL_STATUSES.reduce(
      (acc, value) => ({ ...acc, [value]: 0 }),
      {} as Record<InquiryStatus, number>,
    );
    for (const group of grouped) {
      counts[group.status] = group._count._all;
    }

    const inquiries = rows.map((row) => {
      const lastMessage = row.messages[0] ?? null;
      return {
        id: row.id,
        pharmacyName: row.pharmacy.name,
        branchName: row.branch.name,
        medicineId: row.medicineId,
        medicineName: row.medicine.brandName,
        status: row.status,
        messageCount: row._count.messages,
        lastUpdatedAt: row.updatedAt,
        lastMessageAt: lastMessage?.createdAt ?? null,
        lastMessageSenderType: lastMessage?.senderType ?? null,
        createdAt: row.createdAt,
      };
    });

    return { inquiries, total: inquiries.length, counts };
  }

  /** One of the caller's own inquiries: full thread + context. 404 otherwise. */
  detail(id: string, actor: User): Promise<ClientInquiryDetailResponse> {
    return this.buildDetail(id, actor.id);
  }

  /**
   * Ask a pharmacy about a medicine. Creating the inquiry (status PENDING), its
   * first client message, and the audit entry all run in ONE transaction, so a
   * partial failure can never leave an inquiry without its opening message. The
   * pharmacy is derived from the branch, and the branch is re-validated to
   * actually stock the medicine — the body's ids are never trusted.
   */
  async create(
    dto: ClientInquiryCreateRequest,
    actor: User,
  ): Promise<ClientInquiryDetailResponse> {
    const branch = await this.prisma.pharmacyBranch.findFirst({
      where: { id: dto.branchId },
      select: { id: true, pharmacyId: true },
    });
    if (!branch) {
      throw new BadRequestException('That pharmacy branch does not exist.');
    }

    // The branch must actually carry this medicine (a StockBatch links them).
    const carriesMedicine = await this.prisma.stockBatch.findFirst({
      where: { branchId: dto.branchId, medicineId: dto.medicineId },
      select: { id: true },
    });
    if (!carriesMedicine) {
      throw new BadRequestException(
        'That pharmacy branch does not stock this medicine.',
      );
    }

    const inquiryId = await this.prisma.$transaction(async (tx) => {
      const inquiry = await tx.inquiry.create({
        data: {
          clientId: actor.id,
          pharmacyId: branch.pharmacyId,
          branchId: dto.branchId,
          medicineId: dto.medicineId,
          status: 'PENDING',
        },
        select: { id: true },
      });
      await tx.inquiryMessage.create({
        data: {
          inquiryId: inquiry.id,
          senderId: actor.id,
          senderType: 'CLIENT',
          message: dto.message,
        },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: AUDIT_ACTIONS.INQUIRY_CREATE,
          entity: AUDIT_ENTITIES.INQUIRY,
          entityId: inquiry.id,
          details: {
            pharmacyId: branch.pharmacyId,
            branchId: dto.branchId,
            medicineId: dto.medicineId,
          },
        },
      });
      return inquiry.id;
    });

    return this.buildDetail(inquiryId, actor.id);
  }

  /**
   * Append a client follow-up message. Status is intentionally left unchanged —
   * the officer's dashboard already flags client-last threads; only the explicit
   * close/reopen endpoint changes a client's inquiry status. Ownership is
   * re-checked (404 otherwise); `updatedAt` bumps so the thread re-sorts to top.
   */
  async sendMessage(
    id: string,
    dto: InquiryReplyRequest,
    actor: User,
  ): Promise<ClientInquiryDetailResponse> {
    const clientId = actor.id;
    const inquiry = await this.prisma.inquiry.findFirst({
      where: { id, clientId },
      select: { id: true, status: true },
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found.');
    }
    // A closed inquiry is read-only — the client reopens it first. The UI hides
    // the composer when closed; enforce the same rule here for direct API calls.
    if (inquiry.status === 'CLOSED') {
      throw new BadRequestException(
        'This inquiry is closed. Reopen it to send a message.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inquiryMessage.create({
        data: {
          inquiryId: id,
          senderId: actor.id,
          senderType: 'CLIENT',
          message: dto.message,
        },
      });
      // Adding a child message doesn't touch the parent, so bump updatedAt
      // explicitly to reflect the new activity in list ordering.
      await tx.inquiry.updateMany({
        where: { id, clientId },
        data: { updatedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: AUDIT_ACTIONS.INQUIRY_REPLY,
          entity: AUDIT_ENTITIES.INQUIRY,
          entityId: id,
          details: { by: 'client' },
        },
      });
    });

    return this.buildDetail(id, clientId);
  }

  /**
   * Close the caller's inquiry, or reopen a closed one (to PENDING). The
   * contract already restricts the target to CLOSED / PENDING, so a client can
   * never set the officer-driven IN_PROGRESS / ANSWERED states. Ownership is
   * re-checked; the transition is audited.
   */
  async updateStatus(
    id: string,
    dto: ClientInquiryStatusRequest,
    actor: User,
  ): Promise<ClientInquiryDetailResponse> {
    const clientId = actor.id;
    const inquiry = await this.prisma.inquiry.findFirst({
      where: { id, clientId },
      select: { id: true, status: true },
    });
    if (!inquiry) {
      throw new NotFoundException('Inquiry not found.');
    }

    if (dto.status !== inquiry.status) {
      await this.prisma.inquiry.updateMany({
        where: { id, clientId },
        data: { status: dto.status },
      });
      await this.audit.record({
        userId: actor.id,
        action: AUDIT_ACTIONS.INQUIRY_STATUS_CHANGE,
        entity: AUDIT_ENTITIES.INQUIRY,
        entityId: id,
        details: {
          by: 'client',
          changes: { status: { from: inquiry.status, to: dto.status } },
        },
      });
    }

    return this.buildDetail(id, clientId);
  }

  /** Assemble the caller's inquiry detail (thread + pharmacy/branch + medicine). */
  private async buildDetail(
    id: string,
    clientId: string,
  ): Promise<ClientInquiryDetailResponse> {
    const inquiry = await this.prisma.inquiry.findFirst({
      where: { id, clientId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        medicineId: true,
        pharmacy: { select: { name: true } },
        branch: { select: { name: true } },
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

    // Full catalog record via the shared MedicinesService mapping, read fresh so
    // a price/availability edit surfaces on the client's next refetch.
    const medicine = await this.medicines.getById(inquiry.medicineId);
    if (!medicine) {
      throw new NotFoundException('Medicine not found.');
    }

    return {
      id: inquiry.id,
      status: inquiry.status,
      pharmacyName: inquiry.pharmacy.name,
      branchName: inquiry.branch.name,
      createdAt: inquiry.createdAt,
      updatedAt: inquiry.updatedAt,
      medicine,
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
}
