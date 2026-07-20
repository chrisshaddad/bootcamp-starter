import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupportTicketsService } from './support-tickets.service';
import { Role } from '@/common/enums';

describe('SupportTicketsService', () => {
  const orgId = 'org-1';
  const tenantId = 'tenant-1';
  const adminId = 'admin-1';

  function makeService(
    overrides: { supportTicket?: Partial<Record<string, jest.Mock>> } = {},
  ) {
    const prisma: any = {
      supportTicket: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
        ...overrides.supportTicket,
      },
    };
    const timeline = { emit: jest.fn().mockResolvedValue(undefined) };
    const notifications = { enqueue: jest.fn().mockResolvedValue(undefined) };
    const service = new SupportTicketsService(
      prisma,
      timeline as any,
      notifications as any,
    );
    return { service, prisma, timeline, notifications };
  }

  const ticketRow = (o: Partial<Record<string, unknown>> = {}) => ({
    id: 'ticket-1',
    orgId,
    createdByUserId: tenantId,
    subject: 'No hot water',
    description: 'Been out for two days',
    category: 'maintenance',
    status: 'acknowledged',
    acknowledgedAt: new Date('2026-07-17T00:00:00.000Z'),
    acknowledgedByUserId: null,
    createdAt: new Date('2026-07-17T00:00:00.000Z'),
    updatedAt: new Date('2026-07-17T00:00:00.000Z'),
    ...o,
  });

  describe('findAll', () => {
    it('scopes tenants to their own tickets', async () => {
      const { service, prisma } = makeService({
        supportTicket: { findMany: jest.fn().mockResolvedValue([ticketRow()]) },
      });
      await service.findAll(orgId, tenantId, Role.TENANT);
      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith({
        where: { orgId, createdByUserId: tenantId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('shows all org tickets to staff', async () => {
      const { service, prisma } = makeService();
      await service.findAll(orgId, adminId, Role.ORG_ADMIN);
      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('forbids a tenant from viewing a ticket they did not open', async () => {
      const { service } = makeService({
        supportTicket: {
          findFirst: jest
            .fn()
            .mockResolvedValue(ticketRow({ createdByUserId: 'someone-else' })),
        },
      });
      await expect(
        service.findOne(orgId, tenantId, Role.TENANT, 'ticket-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('creates an auto-acknowledged ticket, emits timeline, and enqueues a notification', async () => {
      const { service, prisma, timeline, notifications } = makeService({
        supportTicket: { create: jest.fn().mockResolvedValue(ticketRow()) },
      });

      const result = await service.create(orgId, tenantId, {
        subject: 'No hot water',
        description: 'Been out for two days',
        category: 'maintenance',
      });

      expect(prisma.supportTicket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId,
          createdByUserId: tenantId,
          status: 'acknowledged',
        }),
      });
      expect(timeline.emit).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'support_ticket.created' }),
      );
      expect(notifications.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: tenantId,
          type: 'support_ticket.acknowledged',
        }),
      );
      expect(result.data.status).toBe('acknowledged');
    });
  });

  describe('updateStatus', () => {
    it('forbids tenants from transitioning tickets', async () => {
      const { service } = makeService();
      await expect(
        service.updateStatus(orgId, tenantId, Role.TENANT, 'ticket-1', {
          status: 'resolved',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lets an admin resolve a ticket and notifies the opener', async () => {
      const { service, prisma, notifications } = makeService({
        supportTicket: {
          findFirst: jest.fn().mockResolvedValue(ticketRow()),
          update: jest
            .fn()
            .mockResolvedValue(ticketRow({ status: 'resolved' })),
        },
      });

      const result = await service.updateStatus(
        orgId,
        adminId,
        Role.ORG_ADMIN,
        'ticket-1',
        { status: 'resolved' },
      );

      expect(prisma.supportTicket.update).toHaveBeenCalled();
      expect(notifications.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: tenantId,
          type: 'support_ticket.resolved',
        }),
      );
      expect(result.data.status).toBe('resolved');
    });

    it('throws NotFound when the ticket does not exist', async () => {
      const { service } = makeService();
      await expect(
        service.updateStatus(orgId, adminId, Role.ORG_ADMIN, 'missing', {
          status: 'closed',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
