import { BadRequestException } from '@nestjs/common';
import { Prisma, type User } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import { AnnouncementsService } from './announcements.service';

const ORGANIZATION_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const GROUP_ID = '33333333-3333-4333-8333-333333333333';
const OTHER_GROUP_ID = '44444444-4444-4444-8444-444444444444';
const ANNOUNCEMENT_ID = '55555555-5555-4555-8555-555555555555';

function groupAnnouncement() {
  return {
    id: ANNOUNCEMENT_ID,
    title: 'Targeted update',
    bodyHtml: '<p>For selected groups.</p>',
    scope: 'GROUP' as const,
    audience: null,
    organizationId: ORGANIZATION_ID,
    eventId: null,
    authorId: USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: {
      name: 'Test Admin',
      email: 'admin@example.com',
    },
    event: null,
    groupTargets: [
      {
        group: {
          id: GROUP_ID,
          name: 'Presenters',
        },
      },
    ],
  };
}

function user(role: User['role']): User {
  return {
    id: USER_ID,
    email: 'member@example.com',
    isConfirmed: true,
    name: 'Test Member',
    role,
    organizationId: role === 'SUPER_ADMIN' ? null : ORGANIZATION_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('AnnouncementsService group visibility', () => {
  it('pins member group visibility to their organization and linked membership', async () => {
    let receivedArgs: Prisma.AnnouncementFindManyArgs | undefined;
    const prisma = {
      announcement: {
        findMany: (args: Prisma.AnnouncementFindManyArgs) => {
          receivedArgs = args;
          return Promise.resolve([]);
        },
        count: jest.fn().mockResolvedValue(0),
      },
    } as unknown as PrismaService;
    const service = new AnnouncementsService(prisma);

    await service.findAll({ page: 1, limit: 20 }, user('MEMBER'));

    if (!receivedArgs) {
      throw new Error('Expected the announcements query to run');
    }
    const whereParts = receivedArgs.where
      ?.AND as Prisma.AnnouncementWhereInput[];
    const alternatives = whereParts[0]?.OR as Prisma.AnnouncementWhereInput[];
    expect(alternatives).toContainEqual({
      scope: 'GROUP',
      organizationId: ORGANIZATION_ID,
      groupTargets: {
        some: {
          organizationId: ORGANIZATION_ID,
          group: {
            organizationId: ORGANIZATION_ID,
            memberships: {
              some: {
                member: {
                  userId: USER_ID,
                  organizationId: ORGANIZATION_ID,
                },
              },
            },
          },
        },
      },
    });
  });

  it('allows org admins to list all group announcements in their org', async () => {
    let receivedArgs: Prisma.AnnouncementFindManyArgs | undefined;
    const prisma = {
      announcement: {
        findMany: (args: Prisma.AnnouncementFindManyArgs) => {
          receivedArgs = args;
          return Promise.resolve([]);
        },
        count: jest.fn().mockResolvedValue(0),
      },
    } as unknown as PrismaService;
    const service = new AnnouncementsService(prisma);

    await service.findAll({ page: 1, limit: 20 }, user('ORG_ADMIN'));

    if (!receivedArgs) {
      throw new Error('Expected the announcements query to run');
    }
    const whereParts = receivedArgs.where
      ?.AND as Prisma.AnnouncementWhereInput[];
    const alternatives = whereParts[0]?.OR as Prisma.AnnouncementWhereInput[];
    expect(alternatives).toContainEqual({
      scope: 'GROUP',
      organizationId: ORGANIZATION_ID,
    });
  });

  it('rejects target group IDs that do not all belong to the caller org', async () => {
    const createAnnouncement = jest.fn();
    const prisma = {
      group: {
        findMany: jest.fn().mockResolvedValue([{ id: GROUP_ID }]),
      },
      announcement: {
        create: createAnnouncement,
      },
    } as unknown as PrismaService;
    const service = new AnnouncementsService(prisma);

    await expect(
      service.create(
        {
          title: 'Targeted update',
          bodyHtml: '<p>For selected groups.</p>',
          scope: 'GROUP',
          groupIds: [GROUP_ID, OTHER_GROUP_ID],
        },
        user('ORG_ADMIN'),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(createAnnouncement).not.toHaveBeenCalled();
  });

  it('rejects replacing group targets with an empty array', async () => {
    const updateAnnouncement = jest.fn();
    const findGroups = jest.fn();
    const prisma = {
      announcement: {
        findFirst: jest.fn().mockResolvedValue(groupAnnouncement()),
        update: updateAnnouncement,
      },
      group: {
        findMany: findGroups,
      },
    } as unknown as PrismaService;
    const service = new AnnouncementsService(prisma);

    await expect(
      service.update(
        ANNOUNCEMENT_ID,
        {
          title: 'Updated title',
          bodyHtml: '<p>Updated body.</p>',
          groupIds: [],
        },
        user('ORG_ADMIN'),
      ),
    ).rejects.toThrow('Group announcements require at least one group');

    expect(findGroups).not.toHaveBeenCalled();
    expect(updateAnnouncement).not.toHaveBeenCalled();
  });

  it('rejects replacement group IDs outside the caller organization', async () => {
    const updateAnnouncement = jest.fn();
    const prisma = {
      announcement: {
        findFirst: jest.fn().mockResolvedValue(groupAnnouncement()),
        update: updateAnnouncement,
      },
      group: {
        findMany: jest.fn().mockResolvedValue([{ id: GROUP_ID }]),
      },
    } as unknown as PrismaService;
    const service = new AnnouncementsService(prisma);

    await expect(
      service.update(
        ANNOUNCEMENT_ID,
        {
          title: 'Updated title',
          bodyHtml: '<p>Updated body.</p>',
          groupIds: [GROUP_ID, OTHER_GROUP_ID],
        },
        user('ORG_ADMIN'),
      ),
    ).rejects.toThrow('All target groups must belong to your organization');

    expect(updateAnnouncement).not.toHaveBeenCalled();
  });

  it('replaces group targets when every group belongs to the caller organization', async () => {
    let updateArgs: Prisma.AnnouncementUpdateArgs | undefined;
    const updated = {
      ...groupAnnouncement(),
      title: 'Updated title',
      bodyHtml: '<p>Updated body.</p>',
      groupTargets: [
        {
          group: {
            id: GROUP_ID,
            name: 'Presenters',
          },
        },
        {
          group: {
            id: OTHER_GROUP_ID,
            name: 'Leadership',
          },
        },
      ],
    };
    const prisma = {
      announcement: {
        findFirst: jest.fn().mockResolvedValue(groupAnnouncement()),
        update: (args: Prisma.AnnouncementUpdateArgs) => {
          updateArgs = args;
          return Promise.resolve(updated);
        },
      },
      group: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: GROUP_ID }, { id: OTHER_GROUP_ID }]),
      },
    } as unknown as PrismaService;
    const service = new AnnouncementsService(prisma);

    const result = await service.update(
      ANNOUNCEMENT_ID,
      {
        title: 'Updated title',
        bodyHtml: '<p>Updated body.</p>',
        groupIds: [GROUP_ID, OTHER_GROUP_ID],
      },
      user('ORG_ADMIN'),
    );

    if (!updateArgs) {
      throw new Error('Expected the announcement update to run');
    }
    expect(updateArgs.where).toEqual({ id: ANNOUNCEMENT_ID });
    expect(updateArgs.data).toEqual({
      title: 'Updated title',
      bodyHtml: '<p>Updated body.</p>',
      groupTargets: {
        deleteMany: {
          organizationId: ORGANIZATION_ID,
        },
        create: [
          {
            organization: { connect: { id: ORGANIZATION_ID } },
            group: { connect: { id: GROUP_ID } },
          },
          {
            organization: { connect: { id: ORGANIZATION_ID } },
            group: { connect: { id: OTHER_GROUP_ID } },
          },
        ],
      },
    });
    expect(result.targetGroups).toEqual([
      { id: GROUP_ID, name: 'Presenters' },
      { id: OTHER_GROUP_ID, name: 'Leadership' },
    ]);
  });
});
