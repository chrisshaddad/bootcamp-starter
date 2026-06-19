import { PrismaClient } from '../../src/generated/prisma/client';

interface CheckInSeed {
  gymName: string;
  memberEmail: string;
  checkedInAt: Date;
  checkedOutAt: Date | null;
}

const CHECK_INS: CheckInSeed[] = [
  // Iron Peak Fitness
  {
    gymName: 'Iron Peak Fitness',
    memberEmail: 'alex.johnson@example.com',
    checkedInAt: new Date('2026-06-16T07:00:00Z'),
    checkedOutAt: new Date('2026-06-16T08:15:00Z'),
  },
  {
    gymName: 'Iron Peak Fitness',
    memberEmail: 'alex.johnson@example.com',
    checkedInAt: new Date('2026-06-18T07:05:00Z'),
    checkedOutAt: new Date('2026-06-18T08:20:00Z'),
  },
  {
    gymName: 'Iron Peak Fitness',
    memberEmail: 'maria.smith@example.com',
    checkedInAt: new Date('2026-06-16T07:02:00Z'),
    checkedOutAt: new Date('2026-06-16T08:10:00Z'),
  },
  {
    gymName: 'Iron Peak Fitness',
    memberEmail: 'maria.smith@example.com',
    checkedInAt: new Date('2026-06-19T09:00:00Z'),
    checkedOutAt: null, // still checked in
  },
  {
    gymName: 'Iron Peak Fitness',
    memberEmail: 'david.park@example.com',
    checkedInAt: new Date('2026-06-10T17:30:00Z'),
    checkedOutAt: new Date('2026-06-10T19:00:00Z'),
  },
  // FlexZone Gym
  {
    gymName: 'FlexZone Gym',
    memberEmail: 'james.brown@example.com',
    checkedInAt: new Date('2026-06-17T10:00:00Z'),
    checkedOutAt: new Date('2026-06-17T11:05:00Z'),
  },
  {
    gymName: 'FlexZone Gym',
    memberEmail: 'sofia.rodriguez@example.com',
    checkedInAt: new Date('2026-06-19T10:30:00Z'),
    checkedOutAt: null, // still checked in
  },
  // ProFit Training
  {
    gymName: 'ProFit Training',
    memberEmail: 'kenji.tanaka@example.com',
    checkedInAt: new Date('2026-06-15T08:00:00Z'),
    checkedOutAt: new Date('2026-06-15T10:00:00Z'),
  },
];

export async function seedCheckIns(prisma: PrismaClient) {
  console.log('Seeding check-ins...');

  let count = 0;
  for (const checkIn of CHECK_INS) {
    const gym = await prisma.gym.findFirst({ where: { name: checkIn.gymName } });
    if (!gym) {
      console.warn(`  Warning: Gym "${checkIn.gymName}" not found. Skipping.`);
      continue;
    }

    const member = await prisma.member.findFirst({
      where: { gymId: gym.id, email: checkIn.memberEmail },
    });
    if (!member) {
      console.warn(
        `  Warning: Member ${checkIn.memberEmail} not found in ${checkIn.gymName}. Skipping.`,
      );
      continue;
    }

    await prisma.checkIn.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        checkedInAt: checkIn.checkedInAt,
        checkedOutAt: checkIn.checkedOutAt,
      },
    });

    const outNote = checkIn.checkedOutAt ? `→ ${checkIn.checkedOutAt.toISOString()}` : '→ still in';
    console.log(
      `  Created check-in: ${checkIn.memberEmail} at ${checkIn.checkedInAt.toISOString()} ${outNote}`,
    );
    count++;
  }

  console.log(`Check-ins seeded: ${count} total`);
}
