import { createHash } from 'node:crypto';
import {
  PrismaClient,
  AttendanceStatus,
} from '../../src/generated/prisma/client';

interface MemberSeed {
  username: string;
  role: 'ADMIN' | 'PRESENTER';
  organizationName: string;
  organizationAdminEmail: string;
  userEmail?: string;
}

interface EventSeed {
  seedKey: string;
  eventName: string;
  presenterUsername: string;
  organizationName: string;
  organizationAdminEmail: string;
  startsAt: Date;
}

interface AttendeeSeed {
  eventSeedKey: string;
  userEmail: string;
  attendanceStatus: AttendanceStatus;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(10, 0, 0, 0);
  return date;
}

function seedEventId(seedKey: string): string {
  const hash = createHash('sha256')
    .update(`coordly:event:${seedKey}`)
    .digest('hex');

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    `4${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

const MEMBERS: MemberSeed[] = [
  {
    username: 'jsmith',
    role: 'ADMIN',
    organizationName: 'TechCorp Solutions',
    organizationAdminEmail: 'admin@techcorp.example.com',
    userEmail: 'admin@techcorp.example.com',
  },
  {
    username: 'alee',
    role: 'PRESENTER',
    organizationName: 'TechCorp Solutions',
    organizationAdminEmail: 'admin@techcorp.example.com',
    userEmail: 'presenter@techcorp.example.com',
  },
  {
    username: 'mchen',
    role: 'ADMIN',
    organizationName: 'Green Energy Partners',
    organizationAdminEmail: 'admin@greenenergy.example.com',
    userEmail: 'admin@greenenergy.example.com',
  },
  {
    username: 'rwilson',
    role: 'PRESENTER',
    organizationName: 'Green Energy Partners',
    organizationAdminEmail: 'admin@greenenergy.example.com',
  },
  {
    username: 'tpatel',
    role: 'PRESENTER',
    organizationName: 'DataSync Analytics',
    organizationAdminEmail: 'admin@datasync.example.com',
  },
];

const EVENTS: EventSeed[] = [
  {
    seedKey: 'techcorp-leadership-workshop',
    eventName: 'Leadership Workshop',
    presenterUsername: 'jsmith',
    organizationName: 'TechCorp Solutions',
    organizationAdminEmail: 'admin@techcorp.example.com',
    startsAt: daysFromNow(7),
  },
  {
    seedKey: 'techcorp-team-sync-meeting',
    eventName: 'Team Sync Meeting',
    presenterUsername: 'alee',
    organizationName: 'TechCorp Solutions',
    organizationAdminEmail: 'admin@techcorp.example.com',
    startsAt: daysFromNow(14),
  },
  {
    seedKey: 'techcorp-onboarding-session',
    eventName: 'New Hire Onboarding',
    presenterUsername: 'alee',
    organizationName: 'TechCorp Solutions',
    organizationAdminEmail: 'admin@techcorp.example.com',
    startsAt: daysFromNow(-3),
  },
  {
    seedKey: 'green-energy-sustainability-camp',
    eventName: 'Sustainability Camp',
    presenterUsername: 'mchen',
    organizationName: 'Green Energy Partners',
    organizationAdminEmail: 'admin@greenenergy.example.com',
    startsAt: daysFromNow(-7),
  },
  {
    seedKey: 'green-energy-renewable-seminar',
    eventName: 'Renewable Energy Seminar',
    presenterUsername: 'mchen',
    organizationName: 'Green Energy Partners',
    organizationAdminEmail: 'admin@greenenergy.example.com',
    startsAt: daysFromNow(10),
  },
  {
    seedKey: 'datasync-analytics-bootcamp',
    eventName: 'Data Analytics Bootcamp',
    presenterUsername: 'tpatel',
    organizationName: 'DataSync Analytics',
    organizationAdminEmail: 'admin@datasync.example.com',
    startsAt: daysFromNow(21),
  },
];

// Event sign-ups on past events with resolved attendance, so reports are not empty.
const ATTENDEES: AttendeeSeed[] = [
  {
    eventSeedKey: 'techcorp-onboarding-session',
    userEmail: 'member@techcorp.example.com',
    attendanceStatus: AttendanceStatus.ATTENDED,
  },
  {
    eventSeedKey: 'techcorp-onboarding-session',
    userEmail: 'presenter@techcorp.example.com',
    attendanceStatus: AttendanceStatus.SKIPPED,
  },
  {
    eventSeedKey: 'green-energy-sustainability-camp',
    userEmail: 'member@greenenergy.example.com',
    attendanceStatus: AttendanceStatus.ATTENDED,
  },
];

async function findOrganizationByAdminEmail(
  prisma: PrismaClient,
  adminEmail: string,
) {
  const orgAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!orgAdmin) {
    return null;
  }

  return prisma.organization.findUnique({
    where: { createdById: orgAdmin.id },
  });
}

export async function seedCoordly(prisma: PrismaClient) {
  console.log('Seeding Coordly members and events...');

  const memberIdsByKey = new Map<string, string>();

  for (const member of MEMBERS) {
    const organization = await findOrganizationByAdminEmail(
      prisma,
      member.organizationAdminEmail,
    );

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
    const organization = await findOrganizationByAdminEmail(
      prisma,
      event.organizationAdminEmail,
    );

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

    await prisma.event.upsert({
      where: { id: seedEventId(event.seedKey) },
      create: {
        id: seedEventId(event.seedKey),
        eventName: event.eventName,
        presenterId,
        organizationId: organization.id,
        startsAt: event.startsAt,
      },
      update: {
        eventName: event.eventName,
        presenterId,
        startsAt: event.startsAt,
      },
    });

    console.log(
      `  Event ready: ${event.eventName} (presenter: ${event.presenterUsername})`,
    );
  }

  for (const attendee of ATTENDEES) {
    const user = await prisma.user.findUnique({
      where: { email: attendee.userEmail },
    });

    if (!user) {
      console.warn(
        `  Warning: User "${attendee.userEmail}" not found. Skipping attendee sign-up.`,
      );
      continue;
    }

    const event = await prisma.event.findUnique({
      where: { id: seedEventId(attendee.eventSeedKey) },
    });

    if (!event) {
      console.warn(
        `  Warning: Event "${attendee.eventSeedKey}" not found. Skipping attendee sign-up.`,
      );
      continue;
    }

    await prisma.eventAttendee.upsert({
      where: {
        eventId_userId: {
          eventId: event.id,
          userId: user.id,
        },
      },
      create: {
        eventId: event.id,
        userId: user.id,
        organizationId: event.organizationId,
        attendanceStatus: attendee.attendanceStatus,
      },
      update: {
        attendanceStatus: attendee.attendanceStatus,
      },
    });

    console.log(
      `  Attendee ready: ${attendee.userEmail} → ${event.eventName} (${attendee.attendanceStatus})`,
    );
  }

  console.log(
    `Coordly seeded: ${MEMBERS.length} members, ${EVENTS.length} events, ${ATTENDEES.length} attendee sign-ups`,
  );
}
