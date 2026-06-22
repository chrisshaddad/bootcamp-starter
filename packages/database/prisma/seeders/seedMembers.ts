import { PrismaClient } from '../../src/generated/prisma/client';

interface MemberSeed {
  gymName: string;
  name: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date | null;
  status: 'ACTIVE' | 'INACTIVE';
  joinedAt: Date;
  // When set, a User account with role MEMBER is created for portal testing
  portalEmail?: string;
}

const MEMBERS: MemberSeed[] = [
  // Iron Peak Fitness
  {
    gymName: 'Iron Peak Fitness',
    name: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phoneNumber: '+1-555-0101',
    dateOfBirth: new Date('1990-03-14'),
    status: 'ACTIVE',
    joinedAt: new Date('2025-11-01'),
    portalEmail: 'alex.johnson@example.com', // has portal access
  },
  {
    gymName: 'Iron Peak Fitness',
    name: 'Maria Smith',
    email: 'maria.smith@example.com',
    phoneNumber: '+1-555-0102',
    dateOfBirth: new Date('1995-07-22'),
    status: 'ACTIVE',
    joinedAt: new Date('2025-11-15'),
    portalEmail: 'maria.smith@example.com', // has portal access
  },
  {
    gymName: 'Iron Peak Fitness',
    name: 'David Park',
    email: 'david.park@example.com',
    phoneNumber: '+1-555-0103',
    dateOfBirth: new Date('1988-01-09'),
    status: 'ACTIVE',
    joinedAt: new Date('2025-12-10'),
    // no portal access yet
  },
  {
    gymName: 'Iron Peak Fitness',
    name: 'Emma Wilson',
    email: 'emma.wilson@example.com',
    phoneNumber: '+1-555-0104',
    dateOfBirth: null,
    status: 'INACTIVE',
    joinedAt: new Date('2025-10-01'),
    // no portal access
  },
  // FlexZone Gym
  {
    gymName: 'FlexZone Gym',
    name: 'James Brown',
    email: 'james.brown@example.com',
    phoneNumber: '+1-555-0201',
    dateOfBirth: new Date('1992-11-30'),
    status: 'ACTIVE',
    joinedAt: new Date('2025-12-01'),
    portalEmail: 'james.brown@example.com', // has portal access
  },
  {
    gymName: 'FlexZone Gym',
    name: 'Sofia Rodriguez',
    email: 'sofia.rodriguez@example.com',
    phoneNumber: '+1-555-0202',
    dateOfBirth: new Date('1998-05-18'),
    status: 'ACTIVE',
    joinedAt: new Date('2026-01-10'),
    // no portal access yet
  },
  {
    gymName: 'FlexZone Gym',
    name: 'Liam Chen',
    email: 'liam.chen@example.com',
    phoneNumber: '+1-555-0203',
    dateOfBirth: null,
    status: 'ACTIVE',
    joinedAt: new Date('2026-02-01'),
    // no portal access
  },
  // ProFit Training (suspended gym — still has member records)
  {
    gymName: 'ProFit Training',
    name: 'Kenji Tanaka',
    email: 'kenji.tanaka@example.com',
    phoneNumber: '+1-555-0301',
    dateOfBirth: new Date('1985-09-05'),
    status: 'ACTIVE',
    joinedAt: new Date('2025-10-01'),
  },
  {
    gymName: 'ProFit Training',
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    phoneNumber: '+1-555-0302',
    dateOfBirth: new Date('1993-04-12'),
    status: 'INACTIVE',
    joinedAt: new Date('2025-09-15'),
  },
];

export async function seedMembers(prisma: PrismaClient) {
  console.log('Seeding members...');

  let count = 0;
  for (const member of MEMBERS) {
    const gym = await prisma.gym.findFirst({
      where: { name: member.gymName },
    });

    if (!gym) {
      console.warn(
        `  Warning: Gym "${member.gymName}" not found. Skipping member ${member.name}.`,
      );
      continue;
    }

    let linkedUserId: string | null = null;

    if (member.portalEmail) {
      // Create a MEMBER User account for portal testing
      const memberUser = await prisma.user.create({
        data: {
          email: member.portalEmail,
          name: member.name,
          role: 'MEMBER',
          isConfirmed: true,
          gymId: gym.id,
        },
      });
      linkedUserId = memberUser.id;
    }

    await prisma.member.create({
      data: {
        gymId: gym.id,
        userId: linkedUserId,
        name: member.name,
        email: member.email,
        phoneNumber: member.phoneNumber,
        dateOfBirth: member.dateOfBirth,
        status: member.status,
        joinedAt: member.joinedAt,
      },
    });

    const portalNote = linkedUserId ? ' (portal enabled)' : '';
    console.log(
      `  Created member: ${member.name} (${member.gymName})${portalNote}`,
    );
    count++;
  }

  console.log(`Members seeded: ${count} total`);
}
