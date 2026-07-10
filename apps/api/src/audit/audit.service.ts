import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { AuditListQuery, AuditListResponse } from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a single audit entry for a write action. Best-effort by design: a
   * failure to log must never break the operation being audited, so any error
   * is swallowed and logged rather than rethrown. Call this only AFTER the write
   * has committed, so a rolled-back change never leaves a phantom log.
   *
   * Never pass secrets (password hashes, tokens, session ids) in `details`.
   */
  async record(entry: {
    userId: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    details?: Prisma.InputJsonValue | null;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          // Prisma distinguishes JSON `null` from DB NULL; use DbNull when we
          // have no details so the column is actually NULL.
          details: entry.details ?? Prisma.DbNull,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log (${entry.action})`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Platform-wide audit log listing for the super-admin console.
   *
   * `AuditLog` is scoped by `userId`, but this read is intentionally
   * cross-tenant: the caller is restricted to `SUPER_ADMIN` at the controller
   * (see `@Roles('SUPER_ADMIN')`), whose job is to monitor activity across the
   * whole platform. This is a read-only view — it never writes, so it produces
   * no audit entries of its own.
   */
  async list(filters: AuditListQuery): Promise<AuditListResponse> {
    const where: Prisma.AuditLogWhereInput = {
      AND: [
        ...(filters.action ? [{ action: filters.action }] : []),
        ...(filters.entity ? [{ entity: filters.entity }] : []),
        ...(filters.userId ? [{ userId: filters.userId }] : []),
      ],
    };

    const logs = await this.prisma.auditLog.findMany({
      where,
      // `id` is a deterministic tie-breaker so rows keep a stable order when
      // several entries share a createdAt timestamp.
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        details: true,
        createdAt: true,
        userId: true,
        // `userId` is a soft ref (onDelete: SetNull), so the actor may be gone.
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      total: logs.length,
      logs: logs.map(({ user, ...log }) => ({
        ...log,
        userName: user ? `${user.firstName} ${user.lastName}` : null,
        userEmail: user?.email ?? null,
      })),
    };
  }
}
