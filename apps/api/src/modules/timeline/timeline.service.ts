import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Role } from '@/common/enums';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';

export interface EmitEventOptions {
  orgId: string;
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async emit(options: EmitEventOptions): Promise<void> {
    try {
      await this.prisma.event.create({
        data: {
          orgId: options.orgId,
          actorId: options.actorId,
          action: options.action,
          targetType: options.targetType,
          targetId: options.targetId,
          metadata: (options.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to emit event '${options.action}': ${String(error)}`,
      );
    }
  }

  async findForCaller(
    orgId: string,
    caller: AuthenticatedUser,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;
    const role = caller.roles[0];

    let where: Record<string, unknown> = { orgId };

    if (role === Role.TENANT) {
      // Tenant: only own events
      where = { orgId, actorId: caller.sub };
    } else if (role === Role.FINANCE) {
      // Finance: billing/payment/subscription events only
      where = {
        orgId,
        action: {
          in: [
            'subscription.created',
            'subscription.updated',
            'subscription.canceled',
            'payment.paid',
            'payment.failed',
            'checkout.completed',
          ],
        },
      };
    }
    // org_admin, supervisor, maintenance: full org feed

    const [items, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    return { items, total, page, limit };
  }
}
