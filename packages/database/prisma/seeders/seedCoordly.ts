import { createHash } from 'node:crypto';
import {
  PrismaClient,
  AttendanceStatus,
  EventStatus,
} from '../../src/generated/prisma/client';

interface OrgRef {
  organizationName: string;
  organizationAdminEmail: string;
}

interface MemberSeed extends OrgRef {
  username: string;
  role: 'ADMIN' | 'PRESENTER';
  userEmail?: string;
}

interface EventSeed extends OrgRef {
  seedKey: string;
  eventName: string;
  presenterUsername: string;
  startsAt: Date;
  status?: 'SCHEDULED' | 'CANCELLED';
}

interface AttendeeSeed {
  eventSeedKey: string;
  userEmail: string;
  attendanceStatus: AttendanceStatus;
}

interface GroupSeed extends OrgRef {
  name: string;
  description: string;
  memberUsernames: string[];
}

function daysFromNow(days: number, hour = 10): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/** Fixed calendar date (local) — month is 1–12 */
function onDate(year: number, month: number, day: number, hour = 10): Date {
  return new Date(year, month - 1, day, hour, 0, 0, 0);
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

const TECHCORP: OrgRef = {
  organizationName: 'TechCorp Solutions',
  organizationAdminEmail: 'admin@techcorp.example.com',
};

const GREEN: OrgRef = {
  organizationName: 'Green Energy Partners',
  organizationAdminEmail: 'admin@greenenergy.example.com',
};

const DATASYNC: OrgRef = {
  organizationName: 'DataSync Analytics',
  organizationAdminEmail: 'admin@datasync.example.com',
};

const FEATURED_MEMBERS: MemberSeed[] = [
  {
    ...TECHCORP,
    username: 'jsmith',
    role: 'ADMIN',
    userEmail: 'admin@techcorp.example.com',
  },
  {
    ...TECHCORP,
    username: 'alee',
    role: 'PRESENTER',
    userEmail: 'presenter@techcorp.example.com',
  },
  {
    ...TECHCORP,
    username: 'pnair',
    role: 'PRESENTER',
    userEmail: 'presenter2@techcorp.example.com',
  },
  {
    ...GREEN,
    username: 'mchen',
    role: 'ADMIN',
    userEmail: 'admin@greenenergy.example.com',
  },
  {
    ...GREEN,
    username: 'sortiz',
    role: 'PRESENTER',
    userEmail: 'presenter@greenenergy.example.com',
  },
  {
    ...GREEN,
    username: 'rwilson',
    role: 'PRESENTER',
  },
  {
    ...DATASYNC,
    username: 'adata',
    role: 'ADMIN',
    userEmail: 'admin@datasync.example.com',
  },
  {
    ...DATASYNC,
    username: 'tpatel',
    role: 'PRESENTER',
  },
];

const TECHCORP_STAFF: Array<{ username: string; role: 'ADMIN' | 'PRESENTER' }> =
  [
    { username: 'kbrown', role: 'ADMIN' },
    { username: 'dwong', role: 'PRESENTER' },
    { username: 'mlopez', role: 'PRESENTER' },
    { username: 'rjain', role: 'PRESENTER' },
    { username: 'scarter', role: 'PRESENTER' },
    { username: 'tyoon', role: 'PRESENTER' },
    { username: 'hburke', role: 'PRESENTER' },
    { username: 'vgomez', role: 'PRESENTER' },
    { username: 'nshaw', role: 'PRESENTER' },
    { username: 'elopez', role: 'PRESENTER' },
    { username: 'cbrady', role: 'PRESENTER' },
    { username: 'amiller', role: 'PRESENTER' },
  ];

const GREEN_STAFF: Array<{ username: string; role: 'ADMIN' | 'PRESENTER' }> = [
  { username: 'ltran', role: 'ADMIN' },
  { username: 'jbrook', role: 'PRESENTER' },
  { username: 'kmehta', role: 'PRESENTER' },
  { username: 'pdiaz', role: 'PRESENTER' },
  { username: 'sreed', role: 'PRESENTER' },
  { username: 'yhughes', role: 'PRESENTER' },
  { username: 'bcho', role: 'PRESENTER' },
  { username: 'rkent', role: 'PRESENTER' },
];

const DATASYNC_STAFF: Array<{ username: string; role: 'ADMIN' | 'PRESENTER' }> =
  [
    { username: 'cwest', role: 'PRESENTER' },
    { username: 'mross', role: 'PRESENTER' },
    { username: 'alang', role: 'PRESENTER' },
  ];

const MEMBERS: MemberSeed[] = [
  ...FEATURED_MEMBERS,
  ...TECHCORP_STAFF.map((m) => ({ ...TECHCORP, ...m })),
  ...GREEN_STAFF.map((m) => ({ ...GREEN, ...m })),
  ...DATASYNC_STAFF.map((m) => ({ ...DATASYNC, ...m })),
];

const NEAR_TERM_EVENTS: EventSeed[] = [
  // TechCorp — upcoming
  {
    ...TECHCORP,
    seedKey: 'techcorp-leadership-workshop',
    eventName: 'Leadership Workshop',
    presenterUsername: 'jsmith',
    startsAt: daysFromNow(7),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-team-sync-meeting',
    eventName: 'Team Sync Meeting',
    presenterUsername: 'alee',
    startsAt: daysFromNow(14, 9),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-product-demo-day',
    eventName: 'Product Demo Day',
    presenterUsername: 'pnair',
    startsAt: daysFromNow(5, 14),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-engineering-allhands',
    eventName: 'Engineering All-Hands',
    presenterUsername: 'dwong',
    startsAt: daysFromNow(21),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-design-critique',
    eventName: 'Design Critique Session',
    presenterUsername: 'mlopez',
    startsAt: daysFromNow(3, 15),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-security-training',
    eventName: 'Security Awareness Training',
    presenterUsername: 'rjain',
    startsAt: daysFromNow(28),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-customer-success-summit',
    eventName: 'Customer Success Summit',
    presenterUsername: 'scarter',
    startsAt: daysFromNow(35, 11),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-hackathon-kickoff',
    eventName: 'Internal Hackathon Kickoff',
    presenterUsername: 'tyoon',
    startsAt: daysFromNow(10, 13),
  },
  // TechCorp — past / cancelled
  {
    ...TECHCORP,
    seedKey: 'techcorp-onboarding-session',
    eventName: 'New Hire Onboarding',
    presenterUsername: 'alee',
    startsAt: daysFromNow(-3),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-q1-planning',
    eventName: 'Q1 Planning Offsite',
    presenterUsername: 'jsmith',
    startsAt: daysFromNow(-21),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-retro-feb',
    eventName: 'Sprint Retrospective',
    presenterUsername: 'hburke',
    startsAt: daysFromNow(-10, 16),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-partner-meetup',
    eventName: 'Partner Meetup',
    presenterUsername: 'vgomez',
    startsAt: daysFromNow(-45),
  },
  {
    ...TECHCORP,
    seedKey: 'techcorp-cancelled-townhall',
    eventName: 'Town Hall (rescheduled)',
    presenterUsername: 'jsmith',
    startsAt: daysFromNow(2),
    status: 'CANCELLED',
  },
  // Green Energy
  {
    ...GREEN,
    seedKey: 'green-energy-sustainability-camp',
    eventName: 'Sustainability Camp',
    presenterUsername: 'mchen',
    startsAt: daysFromNow(-7),
  },
  {
    ...GREEN,
    seedKey: 'green-energy-renewable-seminar',
    eventName: 'Renewable Energy Seminar',
    presenterUsername: 'mchen',
    startsAt: daysFromNow(10),
  },
  {
    ...GREEN,
    seedKey: 'green-energy-field-visit',
    eventName: 'Solar Farm Field Visit',
    presenterUsername: 'sortiz',
    startsAt: daysFromNow(18, 8),
  },
  {
    ...GREEN,
    seedKey: 'green-energy-policy-briefing',
    eventName: 'Policy Briefing',
    presenterUsername: 'rwilson',
    startsAt: daysFromNow(6, 11),
  },
  {
    ...GREEN,
    seedKey: 'green-energy-volunteer-day',
    eventName: 'Community Volunteer Day',
    presenterUsername: 'jbrook',
    startsAt: daysFromNow(24),
  },
  {
    ...GREEN,
    seedKey: 'green-energy-grid-workshop',
    eventName: 'Smart Grid Workshop',
    presenterUsername: 'kmehta',
    startsAt: daysFromNow(-14),
  },
  {
    ...GREEN,
    seedKey: 'green-energy-cancelled-webinar',
    eventName: 'Investor Webinar',
    presenterUsername: 'mchen',
    startsAt: daysFromNow(4),
    status: 'CANCELLED',
  },
  // DataSync
  {
    ...DATASYNC,
    seedKey: 'datasync-analytics-bootcamp',
    eventName: 'Data Analytics Bootcamp',
    presenterUsername: 'tpatel',
    startsAt: daysFromNow(21),
  },
  {
    ...DATASYNC,
    seedKey: 'datasync-dashboard-clinic',
    eventName: 'Dashboard Design Clinic',
    presenterUsername: 'cwest',
    startsAt: daysFromNow(12, 14),
  },
  {
    ...DATASYNC,
    seedKey: 'datasync-ml-office-hours',
    eventName: 'ML Office Hours',
    presenterUsername: 'mross',
    startsAt: daysFromNow(-5),
  },
];

const TECHCORP_PRESENTERS = [
  'alee',
  'pnair',
  'dwong',
  'mlopez',
  'rjain',
  'scarter',
  'tyoon',
  'hburke',
  'vgomez',
  'nshaw',
  'elopez',
  'cbrady',
  'amiller',
  'jsmith',
] as const;

const GREEN_PRESENTERS = [
  'mchen',
  'sortiz',
  'rwilson',
  'jbrook',
  'kmehta',
  'pdiaz',
  'sreed',
  'yhughes',
  'bcho',
  'rkent',
  'ltran',
] as const;

const DATASYNC_PRESENTERS = [
  'tpatel',
  'cwest',
  'mross',
  'alang',
  'adata',
] as const;

const TECHCORP_YEAR_TITLES = [
  'Sprint Planning',
  'Platform Demo',
  'Architecture Review',
  'Team Sync',
  'Customer Advisory Board',
  'Hiring Panel Training',
  'Release Readiness Review',
  'Design System Workshop',
  'Ops Incident Drill',
  'Quarterly Business Review',
] as const;

const GREEN_YEAR_TITLES = [
  'Site Safety Briefing',
  'Community Open House',
  'Carbon Accounting Clinic',
  'Partner Roundtable',
  'Field Technician Training',
  'Grant Writing Workshop',
  'Grid Resilience Seminar',
  'Volunteer Coordinator Meetup',
  'Policy Watch Briefing',
  'Year-End Impact Showcase',
] as const;

const DATASYNC_YEAR_TITLES = [
  'Metrics Review',
  'SQL Lab',
  'Forecasting Clinic',
  'Storytelling with Data',
  'Pipeline Health Check',
] as const;

/** Approx. every 10–12 days from Aug through Dec 2026 */
function buildYearEndEvents(): EventSeed[] {
  const year = 2026;
  const schedule: Array<{ month: number; day: number; hour: number }> = [
    { month: 8, day: 5, hour: 10 },
    { month: 8, day: 14, hour: 14 },
    { month: 8, day: 26, hour: 11 },
    { month: 9, day: 4, hour: 10 },
    { month: 9, day: 16, hour: 15 },
    { month: 9, day: 25, hour: 9 },
    { month: 10, day: 7, hour: 10 },
    { month: 10, day: 16, hour: 13 },
    { month: 10, day: 28, hour: 11 },
    { month: 11, day: 6, hour: 10 },
    { month: 11, day: 18, hour: 14 },
    { month: 11, day: 25, hour: 11 },
    { month: 12, day: 3, hour: 10 },
    { month: 12, day: 11, hour: 15 },
    { month: 12, day: 18, hour: 10 },
    { month: 12, day: 29, hour: 11 },
  ];

  const events: EventSeed[] = [];

  schedule.forEach((slot, index) => {
    const tcPresenter = TECHCORP_PRESENTERS[index % TECHCORP_PRESENTERS.length];
    const tcTitle = TECHCORP_YEAR_TITLES[index % TECHCORP_YEAR_TITLES.length];
    events.push({
      ...TECHCORP,
      seedKey: `techcorp-2026-${slot.month.toString().padStart(2, '0')}-${slot.day.toString().padStart(2, '0')}`,
      eventName: `${tcTitle} (${slot.month}/${slot.day})`,
      presenterUsername: tcPresenter,
      startsAt: onDate(year, slot.month, slot.day, slot.hour),
    });

    const gePresenter = GREEN_PRESENTERS[index % GREEN_PRESENTERS.length];
    const geTitle = GREEN_YEAR_TITLES[index % GREEN_YEAR_TITLES.length];
    events.push({
      ...GREEN,
      seedKey: `green-2026-${slot.month.toString().padStart(2, '0')}-${slot.day.toString().padStart(2, '0')}`,
      eventName: `${geTitle} (${slot.month}/${slot.day})`,
      presenterUsername: gePresenter,
      startsAt: onDate(
        year,
        slot.month,
        slot.day,
        slot.hour === 10 ? 9 : slot.hour,
      ),
    });

    if (index % 2 === 0) {
      const dsPresenter =
        DATASYNC_PRESENTERS[index % DATASYNC_PRESENTERS.length];
      const dsTitle = DATASYNC_YEAR_TITLES[index % DATASYNC_YEAR_TITLES.length];
      events.push({
        ...DATASYNC,
        seedKey: `datasync-2026-${slot.month.toString().padStart(2, '0')}-${slot.day.toString().padStart(2, '0')}`,
        eventName: `${dsTitle} (${slot.month}/${slot.day})`,
        presenterUsername: dsPresenter,
        startsAt: onDate(year, slot.month, slot.day, 14),
      });
    }
  });

  // Explicit year-end landmarks
  events.push(
    {
      ...TECHCORP,
      seedKey: 'techcorp-2026-holiday-party',
      eventName: 'Annual Holiday Celebration',
      presenterUsername: 'jsmith',
      startsAt: onDate(year, 12, 19, 17),
    },
    {
      ...TECHCORP,
      seedKey: 'techcorp-2026-year-wrap',
      eventName: 'Year-End All-Hands',
      presenterUsername: 'jsmith',
      startsAt: onDate(year, 12, 22, 10),
    },
    {
      ...GREEN,
      seedKey: 'green-2026-year-wrap',
      eventName: 'Year-End Sustainability Showcase',
      presenterUsername: 'mchen',
      startsAt: onDate(year, 12, 20, 13),
    },
    {
      ...DATASYNC,
      seedKey: 'datasync-2026-year-wrap',
      eventName: 'Analytics Year in Review',
      presenterUsername: 'adata',
      startsAt: onDate(year, 12, 17, 11),
    },
  );

  return events;
}

const EVENTS: EventSeed[] = [...NEAR_TERM_EVENTS, ...buildYearEndEvents()];

const TECHCORP_ATTENDEE_EMAILS = [
  'member@techcorp.example.com',
  'maya.brooks@techcorp.example.com',
  'noah.patel@techcorp.example.com',
  'sofia.nguyen@techcorp.example.com',
  'liam.carter@techcorp.example.com',
  'ava.kim@techcorp.example.com',
  'ethan.morales@techcorp.example.com',
  'isla.bennett@techcorp.example.com',
  'lucas.hayes@techcorp.example.com',
  'mia.torres@techcorp.example.com',
  'owen.reed@techcorp.example.com',
  'chloe.diaz@techcorp.example.com',
  'iris.park@techcorp.example.com',
  'zoe.coleman@techcorp.example.com',
  'henry.singh@techcorp.example.com',
  'layla.foster@techcorp.example.com',
  'jack.nguyen@techcorp.example.com',
  'ella.brooks@techcorp.example.com',
  'leo.ramirez@techcorp.example.com',
  'presenter@techcorp.example.com',
  'presenter2@techcorp.example.com',
];

const GREEN_ATTENDEE_EMAILS = [
  'member@greenenergy.example.com',
  'nina.walsh@greenenergy.example.com',
  'omar.hassan@greenenergy.example.com',
  'ruby.stone@greenenergy.example.com',
  'kai.vogel@greenenergy.example.com',
  'ivy.lambert@greenenergy.example.com',
  'jude.chen@greenenergy.example.com',
  'nora.blake@greenenergy.example.com',
  'finn.adler@greenenergy.example.com',
  'ada.quincy@greenenergy.example.com',
  'beau.sutton@greenenergy.example.com',
  'cora.mendez@greenenergy.example.com',
  'drew.keller@greenenergy.example.com',
  'presenter@greenenergy.example.com',
];

function rotateEmails(
  emails: string[],
  start: number,
  count: number,
): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i += 1) {
    result.push(emails[(start + i) % emails.length]);
  }
  return result;
}

function buildAttendees(): AttendeeSeed[] {
  const pastStatuses = [
    AttendanceStatus.ATTENDED,
    AttendanceStatus.ATTENDED,
    AttendanceStatus.ATTENDED,
    AttendanceStatus.SKIPPED,
    AttendanceStatus.PENDING,
  ];

  const specs: Array<{
    eventSeedKey: string;
    emails: string[];
    start: number;
    count: number;
    upcoming?: boolean;
  }> = [
    {
      eventSeedKey: 'techcorp-onboarding-session',
      emails: TECHCORP_ATTENDEE_EMAILS,
      start: 0,
      count: 12,
    },
    {
      eventSeedKey: 'techcorp-q1-planning',
      emails: TECHCORP_ATTENDEE_EMAILS,
      start: 3,
      count: 14,
    },
    {
      eventSeedKey: 'techcorp-retro-feb',
      emails: TECHCORP_ATTENDEE_EMAILS,
      start: 6,
      count: 10,
    },
    {
      eventSeedKey: 'techcorp-partner-meetup',
      emails: TECHCORP_ATTENDEE_EMAILS,
      start: 1,
      count: 8,
    },
    {
      eventSeedKey: 'techcorp-leadership-workshop',
      emails: TECHCORP_ATTENDEE_EMAILS,
      start: 0,
      count: 9,
      upcoming: true,
    },
    {
      eventSeedKey: 'techcorp-team-sync-meeting',
      emails: TECHCORP_ATTENDEE_EMAILS,
      start: 4,
      count: 11,
      upcoming: true,
    },
    {
      eventSeedKey: 'techcorp-product-demo-day',
      emails: TECHCORP_ATTENDEE_EMAILS,
      start: 2,
      count: 15,
      upcoming: true,
    },
    {
      eventSeedKey: 'green-energy-sustainability-camp',
      emails: GREEN_ATTENDEE_EMAILS,
      start: 0,
      count: 10,
    },
    {
      eventSeedKey: 'green-energy-grid-workshop',
      emails: GREEN_ATTENDEE_EMAILS,
      start: 2,
      count: 8,
    },
    {
      eventSeedKey: 'green-energy-renewable-seminar',
      emails: GREEN_ATTENDEE_EMAILS,
      start: 1,
      count: 9,
      upcoming: true,
    },
    {
      eventSeedKey: 'green-energy-field-visit',
      emails: GREEN_ATTENDEE_EMAILS,
      start: 3,
      count: 7,
      upcoming: true,
    },
  ];

  const attendees: AttendeeSeed[] = [];
  for (const spec of specs) {
    const emails = rotateEmails(spec.emails, spec.start, spec.count);
    emails.forEach((userEmail, index) => {
      attendees.push({
        eventSeedKey: spec.eventSeedKey,
        userEmail,
        attendanceStatus: spec.upcoming
          ? AttendanceStatus.PENDING
          : pastStatuses[index % pastStatuses.length],
      });
    });
  }
  return attendees;
}

const ATTENDEES = buildAttendees();

const GROUPS: GroupSeed[] = [
  {
    ...TECHCORP,
    name: 'Leadership Team',
    description: 'Org admins and leads coordinating strategy and events.',
    memberUsernames: ['jsmith', 'kbrown', 'alee', 'pnair'],
  },
  {
    ...TECHCORP,
    name: 'Presenters',
    description: 'Staff who host workshops, syncs, and trainings.',
    memberUsernames: [
      'alee',
      'pnair',
      'dwong',
      'mlopez',
      'rjain',
      'scarter',
      'tyoon',
      'hburke',
      'vgomez',
    ],
  },
  {
    ...TECHCORP,
    name: 'Engineering Guild',
    description: 'Engineering presenters for all-hands and hackathons.',
    memberUsernames: ['dwong', 'tyoon', 'hburke', 'nshaw', 'cbrady'],
  },
  {
    ...TECHCORP,
    name: 'Customer Experience',
    description: 'Success and partner-facing presenters.',
    memberUsernames: ['scarter', 'vgomez', 'elopez', 'amiller'],
  },
  {
    ...TECHCORP,
    name: 'New Hire Mentors',
    description: 'Mentors supporting onboarding sessions.',
    memberUsernames: ['alee', 'pnair', 'mlopez', 'nshaw'],
  },
  {
    ...GREEN,
    name: 'Sustainability Leads',
    description: 'Leads for camps, seminars, and field programs.',
    memberUsernames: ['mchen', 'ltran', 'sortiz', 'rwilson'],
  },
  {
    ...GREEN,
    name: 'Field Educators',
    description: 'Presenters for visits, volunteer days, and workshops.',
    memberUsernames: ['sortiz', 'jbrook', 'kmehta', 'pdiaz', 'sreed'],
  },
  {
    ...GREEN,
    name: 'Policy & Outreach',
    description: 'Briefings and community engagement presenters.',
    memberUsernames: ['rwilson', 'yhughes', 'bcho', 'rkent'],
  },
  {
    ...DATASYNC,
    name: 'Analytics Faculty',
    description: 'Bootcamp and clinic instructors.',
    memberUsernames: ['adata', 'tpatel', 'cwest', 'mross', 'alang'],
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
  console.log('Seeding Coordly members, events, attendees, and groups...');

  const memberIdsByKey = new Map<string, string>();
  let memberCount = 0;
  let eventCount = 0;
  let attendeeCount = 0;
  let groupCount = 0;

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

    // userId is unique — free it from any other Member before linking
    if (linkedUser) {
      await prisma.member.updateMany({
        where: {
          userId: linkedUser.id,
          OR: [
            { organizationId: { not: organization.id } },
            { username: { not: member.username } },
          ],
        },
        data: { userId: null },
      });
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
    memberCount += 1;
  }
  console.log(`  Members ready: ${memberCount}`);

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

    const status: EventStatus = event.status ?? 'SCHEDULED';

    await prisma.event.upsert({
      where: { id: seedEventId(event.seedKey) },
      create: {
        id: seedEventId(event.seedKey),
        eventName: event.eventName,
        presenterId,
        organizationId: organization.id,
        startsAt: event.startsAt,
        status,
      },
      update: {
        eventName: event.eventName,
        presenterId,
        startsAt: event.startsAt,
        status,
      },
    });
    eventCount += 1;
  }
  console.log(`  Events ready: ${eventCount}`);

  for (const attendee of ATTENDEES) {
    const user = await prisma.user.findUnique({
      where: { email: attendee.userEmail },
    });

    if (!user) {
      continue;
    }

    const event = await prisma.event.findUnique({
      where: { id: seedEventId(attendee.eventSeedKey) },
    });

    if (!event) {
      continue;
    }

    // Presenters should not register for events they host
    if (event.presenterId) {
      const hostingMember = await prisma.member.findFirst({
        where: {
          id: event.presenterId,
          userId: user.id,
          organizationId: event.organizationId,
        },
      });
      if (hostingMember) {
        continue;
      }
    }

    // Org ADMIN members cannot register as attendees
    const adminMembership = await prisma.member.findFirst({
      where: {
        userId: user.id,
        organizationId: event.organizationId,
        role: 'ADMIN',
      },
    });
    if (adminMembership) {
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
    attendeeCount += 1;
  }
  console.log(`  Attendee sign-ups ready: ${attendeeCount}`);

  for (const group of GROUPS) {
    const organization = await findOrganizationByAdminEmail(
      prisma,
      group.organizationAdminEmail,
    );

    if (!organization) {
      console.warn(
        `  Warning: Organization "${group.organizationName}" not found. Skipping group ${group.name}.`,
      );
      continue;
    }

    const record = await prisma.group.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: group.name,
        },
      },
      create: {
        name: group.name,
        description: group.description,
        organizationId: organization.id,
      },
      update: {
        description: group.description,
      },
    });

    let memberships = 0;
    for (const username of group.memberUsernames) {
      const memberId =
        memberIdsByKey.get(`${group.organizationName}:${username}`) ??
        (
          await prisma.member.findFirst({
            where: {
              organizationId: organization.id,
              username,
            },
          })
        )?.id;

      if (!memberId) {
        continue;
      }

      const existing = await prisma.groupMember.findUnique({
        where: {
          groupId_memberId: {
            groupId: record.id,
            memberId,
          },
        },
      });

      if (existing) {
        memberships += 1;
        continue;
      }

      await prisma.groupMember.create({
        data: {
          groupId: record.id,
          memberId,
        },
      });
      memberships += 1;
    }

    groupCount += 1;
    console.log(
      `  Group ready: ${group.name} (${memberships} members) in ${group.organizationName}`,
    );
  }

  console.log(
    `Coordly seeded: ${memberCount} members, ${eventCount} events, ${attendeeCount} attendee sign-ups, ${groupCount} groups`,
  );
}
