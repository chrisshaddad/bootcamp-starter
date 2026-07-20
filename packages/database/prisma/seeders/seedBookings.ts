import { PrismaClient } from '../../src/generated/prisma/client';

interface BookingSeed {
  gymName: string;
  sessionTitle: string;
  memberEmail: string;
  status: 'BOOKED' | 'CHECKED_IN' | 'CANCELLED';
}

const BOOKINGS: BookingSeed[] = [
  // Morning Bootcamp (COMPLETED) — mixed outcomes
  {
    gymName: 'Iron Peak Fitness',
    sessionTitle: 'Morning Bootcamp',
    memberEmail: 'alex.johnson92@gmail.com',
    status: 'CHECKED_IN',
  },
  {
    gymName: 'Iron Peak Fitness',
    sessionTitle: 'Morning Bootcamp',
    memberEmail: 'maria.s.fitness@outlook.com',
    status: 'CHECKED_IN',
  },
  {
    gymName: 'Iron Peak Fitness',
    sessionTitle: 'Morning Bootcamp',
    memberEmail: 'dpark88@yahoo.com',
    status: 'BOOKED', // booked but never showed
  },
  {
    gymName: 'Iron Peak Fitness',
    sessionTitle: 'Morning Bootcamp',
    memberEmail: 'emmawilson.fit@icloud.com',
    status: 'CANCELLED',
  },
  // Yoga Flow (SCHEDULED)
  {
    gymName: 'Iron Peak Fitness',
    sessionTitle: 'Yoga Flow',
    memberEmail: 'maria.s.fitness@outlook.com',
    status: 'BOOKED',
  },
  {
    gymName: 'Iron Peak Fitness',
    sessionTitle: 'Yoga Flow',
    memberEmail: 'emmawilson.fit@icloud.com',
    status: 'BOOKED',
  },
  // HIIT Circuit (SCHEDULED)
  {
    gymName: 'Iron Peak Fitness',
    sessionTitle: 'HIIT Circuit',
    memberEmail: 'alex.johnson92@gmail.com',
    status: 'BOOKED',
  },
  {
    gymName: 'Iron Peak Fitness',
    sessionTitle: 'HIIT Circuit',
    memberEmail: 'dpark88@yahoo.com',
    status: 'BOOKED',
  },
  // CrossFit WOD (SCHEDULED)
  {
    gymName: 'FlexZone Gym',
    sessionTitle: 'CrossFit WOD',
    memberEmail: 'jbrown.athlete@gmail.com',
    status: 'BOOKED',
  },
  {
    gymName: 'FlexZone Gym',
    sessionTitle: 'CrossFit WOD',
    memberEmail: 'sofia.rdz@outlook.com',
    status: 'BOOKED',
  },
];

export async function seedBookings(prisma: PrismaClient) {
  console.log('Seeding session bookings...');

  let count = 0;
  for (const booking of BOOKINGS) {
    const gym = await prisma.gym.findFirst({
      where: { name: booking.gymName },
    });
    if (!gym) {
      console.warn(`  Warning: Gym "${booking.gymName}" not found. Skipping.`);
      continue;
    }

    const session = await prisma.gymSession.findFirst({
      where: { gymId: gym.id, title: booking.sessionTitle },
    });
    if (!session) {
      console.warn(
        `  Warning: Session "${booking.sessionTitle}" not found in ${booking.gymName}. Skipping.`,
      );
      continue;
    }

    const member = await prisma.member.findFirst({
      where: { gymId: gym.id, email: booking.memberEmail },
    });
    if (!member) {
      console.warn(
        `  Warning: Member ${booking.memberEmail} not found in ${booking.gymName}. Skipping.`,
      );
      continue;
    }

    await prisma.sessionBooking.create({
      data: {
        gymId: gym.id,
        sessionId: session.id,
        memberId: member.id,
        status: booking.status,
      },
    });

    console.log(
      `  Created booking: ${booking.memberEmail} → "${booking.sessionTitle}" (${booking.status})`,
    );
    count++;
  }

  console.log(`Session bookings seeded: ${count} total`);
}
