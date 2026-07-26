import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { TimelineService } from '@/modules/timeline/timeline.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { OrgRecipientsService } from '@/modules/notifications/org-recipients.service';
import { Role } from '@/common/enums';
import {
  SupportTicketCategory,
  SupportTicketResponse,
  SupportTicketStatus,
} from '@repo/contracts';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { UpdateSupportTicketDto } from './dto/update-support-ticket.dto';

/** Roles allowed to transition a ticket (acknowledge / resolve / close). */
const STAFF_MANAGE_ROLES = new Set<Role>([Role.ORG_ADMIN, Role.SUPERVISOR]);

/**
 * Roles that see every ticket in the org. Tenants (and any other role not
 * listed) see only the tickets they opened themselves.
 */
const ORG_WIDE_VIEW_ROLES = new Set<Role>([
  Role.ORG_ADMIN,
  Role.SUPERVISOR,
  Role.FINANCE,
  Role.MAINTENANCE,
]);

type SupportTicketRow = {
  id: string;
  orgId: string;
  createdByUserId: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  acknowledgedAt: Date | null;
  acknowledgedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SupportTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly timeline: TimelineService,
    private readonly notifications: NotificationsService,
    private readonly orgRecipients: OrgRecipientsService,
  ) {}

  private format(t: SupportTicketRow): SupportTicketResponse {
    return {
      id: t.id,
      orgId: t.orgId,
      createdByUserId: t.createdByUserId,
      subject: t.subject,
      description: t.description,
      category: t.category as SupportTicketCategory,
      status: t.status as SupportTicketStatus,
      acknowledgedAt: t.acknowledgedAt ? t.acknowledgedAt.toISOString() : null,
      acknowledgedByUserId: t.acknowledgedByUserId,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  async findAll(
    orgId: string,
    callerId: string,
    callerRole: Role,
  ): Promise<{ data: SupportTicketResponse[] }> {
    const where = ORG_WIDE_VIEW_ROLES.has(callerRole)
      ? { orgId }
      : { orgId, createdByUserId: callerId };

    const tickets = await this.prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return { data: tickets.map((t) => this.format(t)) };
  }

  async findOne(
    orgId: string,
    callerId: string,
    callerRole: Role,
    id: string,
  ): Promise<{ data: SupportTicketResponse }> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, orgId },
    });
    if (!ticket) throw new NotFoundException('Support ticket not found.');

    if (
      !ORG_WIDE_VIEW_ROLES.has(callerRole) &&
      ticket.createdByUserId !== callerId
    ) {
      throw new ForbiddenException(
        'You are not permitted to view this support ticket.',
      );
    }

    return { data: this.format(ticket) };
  }

  async create(
    orgId: string,
    callerId: string,
    dto: CreateSupportTicketDto,
  ): Promise<{ data: SupportTicketResponse }> {
    if (!dto.subject || !dto.description) {
      throw new BadRequestException('subject and description are required.');
    }

    // The platform acknowledges receipt immediately (there is no chat). The
    // acknowledgment MESSAGE is then delivered to the opener asynchronously via
    // the BullMQ notifications queue.
    const ticket = await this.prisma.supportTicket.create({
      data: {
        orgId,
        createdByUserId: callerId,
        subject: dto.subject,
        description: dto.description,
        category: dto.category ?? 'general',
        status: 'acknowledged',
        acknowledgedAt: new Date(),
      },
    });

    await this.timeline.emit({
      orgId,
      actorId: callerId,
      action: 'support_ticket.created',
      targetType: 'SupportTicket',
      targetId: ticket.id,
      metadata: { category: ticket.category, subject: ticket.subject },
    });

    await this.notifications.enqueue({
      orgId,
      userId: callerId,
      type: 'support_ticket.acknowledged',
      title: 'Support ticket received',
      body: `We've received your ticket "${ticket.subject}" and will follow up shortly.`,
      data: {
        ticketId: ticket.id,
        category: ticket.category,
        subject: ticket.subject,
      },
    });

    // …and tell the org's admins there is something to action. The opener is
    // excluded — they already got the acknowledgment above.
    const admins = await this.orgRecipients.getOrgAdminUserIds(orgId, callerId);
    await this.notifications.enqueueMany(admins, {
      orgId,
      type: 'support_ticket.created',
      title: 'New support ticket',
      body: `"${ticket.subject}" (${ticket.category}) was opened and needs a response.`,
      data: {
        ticketId: ticket.id,
        category: ticket.category,
        subject: ticket.subject,
      },
    });

    return { data: this.format(ticket) };
  }

  async updateStatus(
    orgId: string,
    callerId: string,
    callerRole: Role,
    id: string,
    dto: UpdateSupportTicketDto,
  ): Promise<{ data: SupportTicketResponse }> {
    if (!STAFF_MANAGE_ROLES.has(callerRole)) {
      throw new ForbiddenException(
        'Only an org admin or supervisor can update a support ticket.',
      );
    }
    if (!dto.status) {
      throw new BadRequestException('status is required.');
    }

    const existing = await this.prisma.supportTicket.findFirst({
      where: { id, orgId },
    });
    if (!existing) throw new NotFoundException('Support ticket not found.');

    const ticket = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === 'acknowledged' && !existing.acknowledgedAt
          ? { acknowledgedAt: new Date(), acknowledgedByUserId: callerId }
          : {}),
      },
    });

    await this.timeline.emit({
      orgId,
      actorId: callerId,
      action: `support_ticket.${dto.status}`,
      targetType: 'SupportTicket',
      targetId: ticket.id,
      metadata: { status: dto.status },
    });

    // Notify the opener of the status change (unless they changed it themselves).
    if (ticket.createdByUserId !== callerId) {
      await this.notifications.enqueue({
        orgId,
        userId: ticket.createdByUserId,
        type: `support_ticket.${dto.status}`,
        title: `Support ticket ${dto.status}`,
        body: `Your ticket "${ticket.subject}" is now ${dto.status}.`,
        data: {
          ticketId: ticket.id,
          status: dto.status,
          subject: ticket.subject,
        },
      });
    }

    return { data: this.format(ticket) };
  }
}
