import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@repo/db';
import sanitizeHtml from 'sanitize-html';
import type {
  Announcement,
  AnnouncementAudience,
  AnnouncementCreateRequest,
  AnnouncementListQuery,
  AnnouncementListResponse,
  AnnouncementScope,
} from '@repo/contracts';
import { resolveOrganizationScope } from '../common/organization-scope';
import { PrismaService } from '../database/prisma.service';

interface AnnouncementRow {
  id: string;
  title: string;
  bodyHtml: string;
  scope: AnnouncementScope;
  audience: AnnouncementAudience | null;
  organizationId: string | null;
  eventId: string | null;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    name: string;
    email: string;
  };
  event: {
    eventName: string;
  } | null;
}

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private announcementSelect = {
    id: true,
    title: true,
    bodyHtml: true,
    scope: true,
    audience: true,
    organizationId: true,
    eventId: true,
    authorId: true,
    createdAt: true,
    updatedAt: true,
    author: {
      select: {
        name: true,
        email: true,
      },
    },
    event: {
      select: {
        eventName: true,
      },
    },
  } as const;

  private toAnnouncement(announcement: AnnouncementRow): Announcement {
    return {
      id: announcement.id,
      title: announcement.title,
      bodyHtml: announcement.bodyHtml,
      scope: announcement.scope,
      audience: announcement.audience,
      organizationId: announcement.organizationId,
      eventId: announcement.eventId,
      authorId: announcement.authorId,
      authorName: announcement.author.name || announcement.author.email,
      eventName: announcement.event?.eventName ?? null,
      createdAt: announcement.createdAt,
      updatedAt: announcement.updatedAt,
    };
  }

  private sanitizeBody(bodyHtml: string): string {
    const body = sanitizeHtml(bodyHtml, {
      allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li'],
      allowedAttributes: {},
    }).trim();

    if (
      !body ||
      sanitizeHtml(body, { allowedTags: [], allowedAttributes: {} }).trim()
        .length === 0
    ) {
      throw new BadRequestException('Announcement body is required');
    }

    return body;
  }

  private visibleWhere(user: User): Prisma.AnnouncementWhereInput {
    if (user.role === 'SUPER_ADMIN') {
      return {};
    }

    const organizationId = resolveOrganizationScope(user);

    if (user.role === 'ORG_ADMIN') {
      return {
        OR: [
          { scope: 'SITE' },
          { scope: 'ORG', organizationId },
          { scope: 'EVENT', organizationId },
        ],
      };
    }

    return {
      OR: [
        { scope: 'SITE' },
        { scope: 'ORG', organizationId },
        {
          scope: 'EVENT',
          organizationId,
          OR: [
            { audience: 'WHOLE_ORG' },
            {
              event: {
                presenter: {
                  userId: user.id,
                },
              },
            },
            {
              event: {
                attendees: {
                  some: {
                    userId: user.id,
                    organizationId,
                  },
                },
              },
            },
          ],
        },
      ],
    };
  }

  async findAll(
    query: AnnouncementListQuery,
    user: User,
  ): Promise<AnnouncementListResponse> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const where = this.visibleWhere(user);

    const [rows, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: this.announcementSelect,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    this.logger.log(`Listed ${rows.length} announcements (total: ${total})`);

    return {
      announcements: rows.map((row) => this.toAnnouncement(row)),
      total,
    };
  }

  async create(
    body: AnnouncementCreateRequest,
    user: User,
  ): Promise<Announcement> {
    const bodyHtml = this.sanitizeBody(body.bodyHtml);

    if (body.scope === 'SITE') {
      if (user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException(
          'Only super admins can create site-wide announcements',
        );
      }

      const announcement = await this.prisma.announcement.create({
        data: {
          title: body.title,
          bodyHtml,
          scope: 'SITE',
          authorId: user.id,
        },
        select: this.announcementSelect,
      });

      this.logger.log(`Created site announcement ${announcement.id}`);
      return this.toAnnouncement(announcement);
    }

    if (user.role === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Super admins can only create site-wide announcements',
      );
    }

    const organizationId = resolveOrganizationScope(user);

    if (body.scope === 'ORG') {
      if (user.role !== 'ORG_ADMIN') {
        throw new ForbiddenException(
          'Only organization admins can create org-wide announcements',
        );
      }

      const announcement = await this.prisma.announcement.create({
        data: {
          title: body.title,
          bodyHtml,
          scope: 'ORG',
          organizationId,
          authorId: user.id,
        },
        select: this.announcementSelect,
      });

      this.logger.log(`Created org announcement ${announcement.id}`);
      return this.toAnnouncement(announcement);
    }

    if (!body.eventId || !body.audience) {
      throw new BadRequestException(
        'Event announcements require an event and audience',
      );
    }

    const event = await this.prisma.event.findFirst({
      where: {
        id: body.eventId,
        organizationId,
      },
      select: {
        id: true,
        presenterId: true,
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${body.eventId} not found`);
    }

    if (user.role === 'MEMBER') {
      const membership = await this.prisma.member.findFirst({
        where: {
          userId: user.id,
          organizationId,
          role: 'PRESENTER',
        },
        select: { id: true },
      });

      if (!membership || event.presenterId !== membership.id) {
        throw new ForbiddenException(
          'Presenters can only announce events they host',
        );
      }
    } else if (user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException(
        'Only organization admins and event presenters can create event announcements',
      );
    }

    const announcement = await this.prisma.announcement.create({
      data: {
        title: body.title,
        bodyHtml,
        scope: 'EVENT',
        audience: body.audience,
        organizationId,
        eventId: event.id,
        authorId: user.id,
      },
      select: this.announcementSelect,
    });

    this.logger.log(`Created event announcement ${announcement.id}`);
    return this.toAnnouncement(announcement);
  }
}
