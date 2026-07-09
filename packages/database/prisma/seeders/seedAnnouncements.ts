import { createHash } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';

const ANNOUNCEMENTS = [
  [
    'platform-welcome',
    'Welcome to Coordly',
    '<p>Coordly announcements are ready for platform and org updates.</p>',
    'SITE',
    'admin@bootcamp-starter.local',
  ],
  [
    'techcorp-weekly-update',
    'TechCorp weekly update',
    '<p>Confirm presenter availability before Friday.</p>',
    'ORG',
    'admin@techcorp.example.com',
    'admin@techcorp.example.com',
  ],
  [
    'team-sync-reminder',
    'Team Sync reminder',
    '<p>Reminder to be there at 8:30am in BDD Building, Block A.</p>',
    'EVENT',
    'presenter@techcorp.example.com',
    'admin@techcorp.example.com',
    'Team Sync Meeting',
    'EVENT_ATTENDEES',
  ],
  [
    'renewable-seminar-logistics',
    'Renewable Energy Seminar logistics',
    '<p>The seminar room opens 30 minutes early for setup.</p>',
    'EVENT',
    'admin@greenenergy.example.com',
    'admin@greenenergy.example.com',
    'Renewable Energy Seminar',
    'WHOLE_ORG',
  ],
] as const;

function seedAnnouncementId(key: string): string {
  const hash = createHash('sha256')
    .update(`coordly:announcement:${key}`)
    .digest('hex');
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-');
}

export async function seedAnnouncements(prisma: PrismaClient) {
  console.log('Seeding announcements...');

  for (const item of ANNOUNCEMENTS) {
    const [
      key,
      title,
      bodyHtml,
      scope,
      authorEmail,
      orgEmail,
      eventName,
      audience,
    ] = item;
    const author = await prisma.user.findUnique({
      where: { email: authorEmail },
    });
    const orgAdmin = orgEmail
      ? await prisma.user.findUnique({ where: { email: orgEmail } })
      : null;
    const organization = orgAdmin
      ? await prisma.organization.findUnique({
          where: { createdById: orgAdmin.id },
        })
      : null;
    const event =
      eventName && organization
        ? await prisma.event.findFirst({
            where: { eventName, organizationId: organization.id },
          })
        : null;

    if (!author || (orgEmail && !organization) || (eventName && !event)) {
      console.warn(`  Warning: Skipping announcement ${title}.`);
      continue;
    }

    const data = {
      title,
      bodyHtml,
      scope,
      audience: audience ?? null,
      organizationId: organization?.id ?? null,
      eventId: event?.id ?? null,
      authorId: author.id,
    };

    await prisma.announcement.upsert({
      where: { id: seedAnnouncementId(key) },
      create: { id: seedAnnouncementId(key), ...data },
      update: data,
    });
    console.log(`  Announcement ready: ${title}`);
  }
}
