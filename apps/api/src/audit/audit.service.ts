import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '@repo/db';
import { AuditLogListRequest } from '@repo/contracts';

export interface AuditLogParams {
  gymId: string | null;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string | null;
  metadata?: any;
  ipAddress?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Logs an action to the audit log asynchronously.
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.db.auditLog.create({
        data: {
          gymId: params.gymId,
          userId: params.userId,
          userName: params.userName,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          entityName: params.entityName,
          metadata: params.metadata
            ? (params.metadata as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          ipAddress: params.ipAddress,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create audit log for action ${params.action}`,
        error,
      );
    }
  }

  /**
   * Lists audit logs with pagination and filters.
   */
  async list(gymId: string | null, filters: AuditLogListRequest) {
    const { page, limit, entityType, action, userId, startDate, endDate } =
      filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      // Exact match, including null: SUPER_ADMIN (gymId === null) must see only
      // platform-level events, never fall through to every tenant's activity.
      gymId,
      ...(entityType ? { entityType } : {}),
      ...(action ? { action } : {}),
      ...(userId ? { userId } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const [total, data] = await Promise.all([
      this.db.auditLog.count({ where }),
      this.db.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
