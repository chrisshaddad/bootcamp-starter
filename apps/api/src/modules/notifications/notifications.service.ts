import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { NotificationResponse } from '@repo/contracts';
import {
  DELIVER_NOTIFICATION_JOB,
  NOTIFICATIONS_QUEUE,
  NotificationJobData,
} from './notifications.constants';

type NotificationRow = {
  id: string;
  orgId: string;
  userId: string;
  type: string;
  title: string;
  body: string | null;
  data: Prisma.JsonValue;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Best-effort enqueue of a notification for asynchronous delivery. Never
   * throws: delivery is decoupled from the caller, so a Redis hiccup must not
   * fail the originating request (mirrors TimelineService.emit).
   */
  async enqueue(job: NotificationJobData): Promise<void> {
    try {
      await this.queue.add(DELIVER_NOTIFICATION_JOB, job, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 500,
      });
    } catch (error) {
      this.logger.error(
        `Failed to enqueue notification '${job.type}' for ${job.userId}: ${String(error)}`,
      );
    }
  }

  /**
   * Fan a single notification out to several recipients. Same best-effort
   * contract as {@link enqueue}: a failing recipient never blocks the others,
   * and an empty recipient list is a no-op.
   */
  async enqueueMany(
    userIds: string[],
    job: Omit<NotificationJobData, 'userId'>,
  ): Promise<void> {
    await Promise.all(
      userIds.map((userId) => this.enqueue({ ...job, userId })),
    );
  }

  /** Persist a notification row — invoked by the queue worker. */
  async persist(job: NotificationJobData): Promise<void> {
    await this.prisma.notification.create({
      data: {
        orgId: job.orgId,
        userId: job.userId,
        type: job.type,
        title: job.title,
        body: job.body ?? null,
        data: (job.data ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  private format(n: NotificationRow): NotificationResponse {
    return {
      id: n.id,
      orgId: n.orgId,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      data: (n.data ?? {}) as Record<string, unknown>,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    };
  }

  async listForUser(
    orgId: string,
    userId: string,
  ): Promise<{ data: NotificationResponse[]; unreadCount: number }> {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { orgId, userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({
        where: { orgId, userId, readAt: null },
      }),
    ]);
    return { data: items.map((i) => this.format(i)), unreadCount };
  }

  async unreadCount(
    orgId: string,
    userId: string,
  ): Promise<{ unreadCount: number }> {
    const unreadCount = await this.prisma.notification.count({
      where: { orgId, userId, readAt: null },
    });
    return { unreadCount };
  }

  async markRead(
    orgId: string,
    userId: string,
    id: string,
  ): Promise<{ data: NotificationResponse }> {
    const existing = await this.prisma.notification.findFirst({
      where: { id, orgId, userId },
    });
    if (!existing) throw new NotFoundException('Notification not found.');

    const updated = existing.readAt
      ? existing
      : await this.prisma.notification.update({
          where: { id },
          data: { readAt: new Date() },
        });

    return { data: this.format(updated) };
  }

  async markAllRead(orgId: string, userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { orgId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { count: result.count };
  }
}
