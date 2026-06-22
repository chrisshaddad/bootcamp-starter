import { PrismaClient } from '../../src/generated/prisma/client';

interface MemberSeed {
  username: string;
  role: 'ADMIN' | 'PRESENTER';
  organizationName: string;
  userEmail?: string;
}

interface EventSeed {
  eventName: string;
  presenterUsername: string;
  organizationName: string;
  startsAt: Date;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(10, 0, 0, 0);
  return date;
}

const MEMBERS: MemberSeed[] = [
  {
    username: 'jsmith',
    role: 'ADMIN',
    organizationName: 'TechCorp Solutions',
    userEmail: 'admin@techcorp.example.com',
  },
  {
    username: 'alee',
    role: 'PRESENTER',
    organizationName: 'TechCorp Solutions',
    userEmail: 'presenter@techcorp.example.com',
  },
  {
    username: 'mchen',
    role: 'ADMIN',
    organizationName: 'Green Energy Partners',
    userEmail: 'admin@greenenergy.example.com',
  },
  {
    username: 'rwilson',
    role: 'PRESENTER',
    organizationName: 'Green Energy Partners',
  },
  {
    username: 'tpatel',
    role: 'PRESENTER',
    organizationName: 'DataSync Analytics',
  },
];

const EVENTS: EventSeed[] = [
  {
    eventName: 'Leadership Workshop',
    presenterUsername: 'jsmith',
    organizationName: 'TechCorp Solutions',
    startsAt: daysFromNow(7),
  },
  {
    eventName: 'Team Sync Meeting',
    presenterUsername: 'alee',
    organizationName: 'TechCorp Solutions',
    startsAt: daysFromNow(14),
  },
  {
    eventName: 'Sustainability Camp',
    presenterUsername: 'mchen',
    organizationName: 'Green Energy Partners',
    startsAt: daysFromNow(-7),
  },
  {
    eventName: 'Renewable Energy Seminar',
    presenterUsername: 'mchen',
    organizationName: 'Green Energy Partners',
    startsAt: daysFromNow(10),
  },
  {
    eventName: 'Data Analytics Bootcamp',
    presenterUsername: 'tpatel',
    organizationName: 'DataSync Analytics',
    startsAt: daysFromNow(21),
  },
];

export async function seedCoordly(prisma: PrismaClient) {
  console.log('Seeding Coordly members and events...');

  const memberIdsByKey = new Map<string, string>();

  for (const member of MEMBERS) {
    const organization = await prisma.organization.findFirst({
      where: { name: member.organizationName },
    });

    if (!organization) {
      console.warn(
        `  Warning: Organization "${member.organizationName}" not found. Skipping member ${member.username}.`,
      );
      continue;
    }

    const linkedUser = member.userEmail
      ? await prisma.user.findUnique({
          where: { email: member.userEmail },
        })
      : null;

    if (member.userEmail && !linkedUser) {
      console.warn(
        `  Warning: User "${member.userEmail}" not found. Skipping member ${member.username}.`,
      );
      continue;
    }

    const record = await prisma.member.upsert({
      where: {
        organizationId_username: {
          organizationId: organization.id,
          username: member.username,
        },
      },
      create: {
        username: member.username,
        role: member.role,
        organizationId: organization.id,
        userId: linkedUser?.id,
      },
      update: {
        role: member.role,
        userId: linkedUser?.id,
      },
    });

    memberIdsByKey.set(
      `${member.organizationName}:${member.username}`,
      record.id,
    );

    console.log(
      `  Member ready: ${member.username} (${member.role}) in ${member.organizationName}${
        linkedUser ? ` — linked to ${linkedUser.email}` : ''
      }`,
    );
  }

  for (const event of EVENTS) {
    const organization = await prisma.organization.findFirst({
      where: { name: event.organizationName },
    });

    if (!organization) {
      console.warn(
        `  Warning: Organization "${event.organizationName}" not found. Skipping event ${event.eventName}.`,
      );
      continue;
    }

    const presenterId =
      memberIdsByKey.get(
        `${event.organizationName}:${event.presenterUsername}`,
      ) ??
      (
        await prisma.member.findFirst({
          where: {
            organizationId: organization.id,
            username: event.presenterUsername,
          },
        })
      )?.id;

    if (!presenterId) {
      console.warn(
        `  Warning: Presenter "${event.presenterUsername}" not found. Skipping event ${event.eventName}.`,
      );
      continue;
    }

    const existingEvent = await prisma.event.findFirst({
      where: {
        eventName: event.eventName,
        organizationId: organization.id,
      },
    });

    if (existingEvent) {
      await prisma.event.update({
        where: { id: existingEvent.id },
        data: {
          presenterId,
          startsAt: event.startsAt,
        },
      });
      console.log(`  Event updated: ${event.eventName}`);
      continue;
    }

    await prisma.event.create({
      data: {
        eventName: event.eventName,
        presenterId,
        organizationId: organization.id,
        startsAt: event.startsAt,
      },
    });

    console.log(
      `  Created event: ${event.eventName} (presenter: ${event.presenterUsername})`,
    );
  }

  console.log(
    `Coordly seeded: ${MEMBERS.length} members, ${EVENTS.length} events`,
  );
}
