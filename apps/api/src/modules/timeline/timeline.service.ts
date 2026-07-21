import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { Prisma } from '@repo/db';
import { Role } from '@/common/enums';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { KeycloakAdminService } from '@/infrastructure/keycloak/keycloak-admin.service';

export interface EmitEventOptions {
  orgId: string;
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/** F5.2: how long a resolved actor display name is cached before re-fetching. */
const ACTOR_NAME_CACHE_TTL_MS = 5 * 60 * 1000;

interface ActorNameCacheEntry {
  name: string | null;
  expiresAt: number;
}

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  /**
   * F5.2: process-local cache of actorId (Keycloak sub) -> resolved display
   * name, so the activity feed doesn't hit Keycloak once per event per
   * request. Small TTL rather than forever, so a user's name change (rare)
   * eventually shows up without a restart.
   */
  private readonly actorNameCache = new Map<string, ActorNameCacheEntry>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
  ) {}

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

    return {
      items: await this.enrichWithActorNames(items),
      total,
      page,
      limit,
    };
  }

  /**
   * F5.2: resolve each event's `actorId` (a Keycloak sub) to a display name
   * for the activity feed's "who" column. Deduped per page (one KC lookup per
   * distinct actor, not per event) and cached across requests; a null/missing
   * actorId (system-generated event) or an unresolvable actor both yield a
   * null `actorName` rather than throwing — the feed must always return.
   */
  private async enrichWithActorNames<
    T extends { actorId?: string | null },
  >(events: T[]): Promise<(T & { actorName: string | null })[]> {
    const distinctActorIds = [
      ...new Set(
        events
          .map((e) => e.actorId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const nameByActorId = new Map<string, string | null>();
    await Promise.all(
      distinctActorIds.map(async (actorId) => {
        nameByActorId.set(actorId, await this.resolveActorName(actorId));
      }),
    );

    return events.map((e) => ({
      ...e,
      actorName: e.actorId ? (nameByActorId.get(e.actorId) ?? null) : null,
    }));
  }

  /** Resolve (and cache) a single actor's display name by Keycloak sub. */
  private async resolveActorName(sub: string): Promise<string | null> {
    const cached = this.actorNameCache.get(sub);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.name;
    }

    let name: string | null = null;
    try {
      const user = await this.keycloakAdmin.getUser(sub);
      name = this.extractDisplayName(user);
    } catch (error) {
      // Never let a KC hiccup fail the whole feed — the event still renders,
      // just without a resolved actor name.
      this.logger.warn(`Failed to resolve actor name for ${sub}: ${String(error)}`);
      name = null;
    }

    this.actorNameCache.set(sub, {
      name,
      expiresAt: now + ACTOR_NAME_CACHE_TTL_MS,
    });
    return name;
  }

  /** firstName + lastName, falling back to email, then null. */
  private extractDisplayName(
    user: Record<string, unknown> | null,
  ): string | null {
    if (!user) return null;
    const firstName = typeof user.firstName === 'string' ? user.firstName : '';
    const lastName = typeof user.lastName === 'string' ? user.lastName : '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
    const email = user.email;
    return typeof email === 'string' && email.length > 0 ? email : null;
  }
}
