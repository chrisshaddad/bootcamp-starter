import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { LinkedEntityType } from '@repo/db';
import type { NotificationListResponse } from '@repo/contracts';

interface CreateNotificationInput {
  recipientId: string;
  senderId?: string | null;
  title: string;
  body: string;
  linkedEntityType?: LinkedEntityType | null;
  linkedEntityId?: string | null;
}

const MAX_NOTIFICATIONS = 50;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Emit a system notification. Called by other modules (Assignments, Records)
   * when a domain event happens — notifications are system-generated, never
   * user-composed. `senderId` is recorded for traceability but senderType
   * stays SYSTEM.
   */
  async create(input: CreateNotificationInput): Promise<void> {
    await this.prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        senderId: input.senderId ?? null,
        senderType: 'SYSTEM',
        title: input.title,
        body: input.body,
        linkedEntityType: input.linkedEntityType ?? null,
        linkedEntityId: input.linkedEntityId ?? null,
      },
    });
    this.logger.log(`Notification created for user ${input.recipientId}`);
  }

  /**
   * List the caller's own notifications (most recent first) plus an unread count.
   */
  async findForUser(userId: string): Promise<NotificationListResponse> {
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: 'desc' },
        take: MAX_NOTIFICATIONS,
        select: {
          id: true,
          title: true,
          body: true,
          isRead: true,
          linkedEntityType: true,
          linkedEntityId: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where: { recipientId: userId } }),
      this.prisma.notification.count({
        where: { recipientId: userId, isRead: false },
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  async markRead(userId: string, id: string): Promise<void> {
    const result = await this.prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    });

    if (result.count === 0) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }
}
