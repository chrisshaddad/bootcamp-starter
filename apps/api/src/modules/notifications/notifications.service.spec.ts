import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const orgId = 'org-1';
  const userId = 'user-1';

  function makeService(
    overrides: {
      notification?: Partial<Record<string, jest.Mock>>;
      queue?: Partial<Record<string, jest.Mock>>;
    } = {},
  ) {
    const prisma: any = {
      notification: {
        create: jest.fn().mockResolvedValue(undefined),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
        ...overrides.notification,
      },
    };
    const queue: any = {
      add: jest.fn().mockResolvedValue(undefined),
      ...overrides.queue,
    };
    const service = new NotificationsService(queue, prisma);
    return { service, prisma, queue };
  }

  const notificationRow = (o: Partial<Record<string, unknown>> = {}) => ({
    id: 'notif-1',
    orgId,
    userId,
    type: 'support_ticket.acknowledged',
    title: 'Support ticket received',
    body: 'We got it.',
    data: { ticketId: 't-1' },
    readAt: null,
    createdAt: new Date('2026-07-17T00:00:00.000Z'),
    ...o,
  });

  describe('enqueue', () => {
    it('adds a delivery job to the queue', async () => {
      const { service, queue } = makeService();
      await service.enqueue({ orgId, userId, type: 'x', title: 'T' });
      expect(queue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({ orgId, userId, type: 'x', title: 'T' }),
        expect.any(Object),
      );
    });

    it('never throws when the queue is unavailable (best-effort delivery)', async () => {
      const { service } = makeService({
        queue: { add: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) },
      });
      await expect(
        service.enqueue({ orgId, userId, type: 'x', title: 'T' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('persist', () => {
    it('writes a notification row from a job', async () => {
      const { service, prisma } = makeService();
      await service.persist({
        orgId,
        userId,
        type: 'support_ticket.acknowledged',
        title: 'T',
        body: 'B',
        data: { ticketId: 't-1' },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId,
          userId,
          type: 'support_ticket.acknowledged',
          title: 'T',
          body: 'B',
        }),
      });
    });
  });

  describe('listForUser', () => {
    it('returns the caller notifications with unread count', async () => {
      const { service } = makeService({
        notification: {
          findMany: jest.fn().mockResolvedValue([notificationRow()]),
          count: jest.fn().mockResolvedValue(1),
        },
      });
      const result = await service.listForUser(orgId, userId);
      expect(result.unreadCount).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ id: 'notif-1', readAt: null });
    });
  });

  describe('markRead', () => {
    it('throws when the notification is not found or not the caller', async () => {
      const { service } = makeService();
      await expect(service.markRead(orgId, userId, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('sets readAt when currently unread', async () => {
      const updated = notificationRow({ readAt: new Date() });
      const { service, prisma } = makeService({
        notification: {
          findFirst: jest.fn().mockResolvedValue(notificationRow()),
          update: jest.fn().mockResolvedValue(updated),
        },
      });
      const result = await service.markRead(orgId, userId, 'notif-1');
      expect(prisma.notification.update).toHaveBeenCalled();
      expect(result.data.readAt).not.toBeNull();
    });
  });

  describe('markAllRead', () => {
    it('returns the number of notifications marked read', async () => {
      const { service } = makeService({
        notification: {
          updateMany: jest.fn().mockResolvedValue({ count: 3 }),
        },
      });
      const result = await service.markAllRead(orgId, userId);
      expect(result).toEqual({ count: 3 });
    });
  });
});
