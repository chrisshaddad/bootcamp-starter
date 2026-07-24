import {
  PrismaClient,
  Prisma,
  UserRole,
} from '../../src/generated/prisma/client';

const SUPER_ADMINS: Prisma.UserCreateManyInput[] = [
  {
    email: 'admin@bootcamp-starter.local',
    name: 'Super Admin',
  },
];

// Org admins - linked to organizations in seedOrganizations.ts
const ORG_ADMINS: Prisma.UserCreateManyInput[] = [
  {
    email: 'admin@techcorp.example.com',
    name: 'Sarah Chen',
  },
  {
    email: 'admin@greenenergy.example.com',
    name: 'Michael Green',
  },
  {
    email: 'admin@healthfirst.example.com',
    name: 'Dr. Emily Watson',
  },
  {
    email: 'admin@urbanconstruction.example.com',
    name: 'Robert Martinez',
  },
  {
    email: 'admin@fraudulent.example.com',
    name: 'John Suspicious',
  },
  {
    email: 'admin@datasync.example.com',
    name: 'Anna Data',
  },
];

/** Demo login accounts used in README / walkthroughs */
const FEATURED_ATTENDEES: Prisma.UserCreateManyInput[] = [
  { email: 'member@techcorp.example.com', name: 'Alex Rivera' },
  { email: 'member@greenenergy.example.com', name: 'Jordan Lee' },
  { email: 'presenter@techcorp.example.com', name: 'Alex Lee' },
  { email: 'presenter2@techcorp.example.com', name: 'Priya Nair' },
  { email: 'presenter@greenenergy.example.com', name: 'Sam Ortiz' },
];

const TECHCORP_ATTENDEE_NAMES = [
  ['Maya', 'Brooks'],
  ['Noah', 'Patel'],
  ['Sofia', 'Nguyen'],
  ['Liam', 'Carter'],
  ['Ava', 'Kim'],
  ['Ethan', 'Morales'],
  ['Isla', 'Bennett'],
  ['Lucas', 'Hayes'],
  ['Mia', 'Torres'],
  ['Owen', 'Reed'],
  ['Chloe', 'Diaz'],
  ['Iris', 'Park'],
  ['Zoe', 'Coleman'],
  ['Henry', 'Singh'],
  ['Layla', 'Foster'],
  ['Jack', 'Nguyen'],
  ['Ella', 'Brooks'],
  ['Leo', 'Ramirez'],
] as const;

const GREEN_ATTENDEE_NAMES = [
  ['Nina', 'Walsh'],
  ['Omar', 'Hassan'],
  ['Ruby', 'Stone'],
  ['Kai', 'Vogel'],
  ['Ivy', 'Lambert'],
  ['Jude', 'Chen'],
  ['Nora', 'Blake'],
  ['Finn', 'Adler'],
  ['Ada', 'Quincy'],
  ['Beau', 'Sutton'],
  ['Cora', 'Mendez'],
  ['Drew', 'Keller'],
] as const;

function attendeeEmail(first: string, last: string, domain: string): string {
  return `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
}

function attendeeName(first: string, last: string): string {
  return `${first} ${last}`;
}

const GENERATED_ATTENDEES: Prisma.UserCreateManyInput[] = [
  ...TECHCORP_ATTENDEE_NAMES.map(([first, last]) => ({
    email: attendeeEmail(first, last, 'techcorp.example.com'),
    name: attendeeName(first, last),
  })),
  ...GREEN_ATTENDEE_NAMES.map(([first, last]) => ({
    email: attendeeEmail(first, last, 'greenenergy.example.com'),
    name: attendeeName(first, last),
  })),
];

const ATTENDEE_USERS: Prisma.UserCreateManyInput[] = [
  ...FEATURED_ATTENDEES,
  ...GENERATED_ATTENDEES,
];

/** Shared with seedCoordly attendance lists (featured + generated, org-grouped). */
export const TECHCORP_ATTENDEE_EMAILS = [
  'member@techcorp.example.com',
  ...TECHCORP_ATTENDEE_NAMES.map(([first, last]) =>
    attendeeEmail(first, last, 'techcorp.example.com'),
  ),
  'presenter@techcorp.example.com',
  'presenter2@techcorp.example.com',
];

export const GREEN_ATTENDEE_EMAILS = [
  'member@greenenergy.example.com',
  ...GREEN_ATTENDEE_NAMES.map(([first, last]) =>
    attendeeEmail(first, last, 'greenenergy.example.com'),
  ),
  'presenter@greenenergy.example.com',
];

async function upsertUsers(
  prisma: PrismaClient,
  users: Prisma.UserCreateManyInput[],
  role: UserRole,
  label: string,
) {
  console.log(`Seeding ${label}...`);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: {
        email: user.email,
        name: user.name,
        isConfirmed: true,
        role,
      },
      update: {
        name: user.name,
        isConfirmed: true,
        role,
      },
    });
  }

  console.log(`${label}: ${users.length} ready.`);
}

export async function seedSuperAdmins(prisma: PrismaClient) {
  await upsertUsers(prisma, SUPER_ADMINS, 'SUPER_ADMIN', 'super admins');
}

export async function seedOrgAdmins(prisma: PrismaClient) {
  await upsertUsers(prisma, ORG_ADMINS, 'ORG_ADMIN', 'org admins');
}

export async function seedAttendeeUsers(prisma: PrismaClient) {
  await upsertUsers(prisma, ATTENDEE_USERS, 'MEMBER', 'attendee users');
}

/** Exported for organization linking */
export const DEMO_ORG_USER_LINKS: {
  email: string;
  organizationName: string;
}[] = [
  ...FEATURED_ATTENDEES.filter((u) => u.email.includes('techcorp')).map(
    (u) => ({
      email: u.email,
      organizationName: 'TechCorp Solutions',
    }),
  ),
  ...FEATURED_ATTENDEES.filter((u) => u.email.includes('greenenergy')).map(
    (u) => ({
      email: u.email,
      organizationName: 'Green Energy Partners',
    }),
  ),
  ...GENERATED_ATTENDEES.filter((u) =>
    u.email.endsWith('@techcorp.example.com'),
  ).map((u) => ({
    email: u.email,
    organizationName: 'TechCorp Solutions',
  })),
  ...GENERATED_ATTENDEES.filter((u) =>
    u.email.endsWith('@greenenergy.example.com'),
  ).map((u) => ({
    email: u.email,
    organizationName: 'Green Energy Partners',
  })),
];
