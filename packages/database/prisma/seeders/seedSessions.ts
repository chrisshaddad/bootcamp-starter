import { PrismaClient } from '../../src/generated/prisma/client';

interface SessionSeed {
  gymName: string;
  title: string;
  description: string | null;
  instructorEmail: string | null; // null → unassigned
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
}

const SESSIONS: SessionSeed[] = [
  // Iron Peak Fitness — one past (COMPLETED), two upcoming (SCHEDULED)
  {
    gymName: 'Iron Peak Fitness',
    title: 'Morning Bootcamp',
    description: 'High-intensity full-body workout to kick off the week.',
    instructorEmail: 'marcus.reed@ironpeak.example.com',
    startsAt: new Date('2026-06-16T07:00:00Z'),
    endsAt: new Date('2026-06-16T08:00:00Z'),
    capacity: 20,
    status: 'COMPLETED',
  },
  {
    gymName: 'Iron Peak Fitness',
    title: 'Yoga Flow',
    description: 'Relaxing vinyasa flow for all levels. Bring your own mat.',
    instructorEmail: 'lisa.park@ironpeak.example.com',
    startsAt: new Date('2026-06-21T09:00:00Z'),
    endsAt: new Date('2026-06-21T10:00:00Z'),
    capacity: 15,
    status: 'SCHEDULED',
  },
  {
    gymName: 'Iron Peak Fitness',
    title: 'HIIT Circuit',
    description: '45-minute high-intensity interval training with stations.',
    instructorEmail: 'marcus.reed@ironpeak.example.com',
    startsAt: new Date('2026-06-24T18:00:00Z'),
    endsAt: new Date('2026-06-24T18:45:00Z'),
    capacity: 25,
    status: 'SCHEDULED',
  },
  // FlexZone Gym — one upcoming (SCHEDULED), one CANCELLED
  {
    gymName: 'FlexZone Gym',
    title: 'CrossFit WOD',
    description:
      'Workout of the day — scaled options available for all abilities.',
    instructorEmail: 'carlos.diaz@flexzone.example.com',
    startsAt: new Date('2026-06-22T10:00:00Z'),
    endsAt: new Date('2026-06-22T11:00:00Z'),
    capacity: 18,
    status: 'SCHEDULED',
  },
  {
    gymName: 'FlexZone Gym',
    title: 'Pilates Foundations',
    description: 'Core strength and posture fundamentals.',
    instructorEmail: 'nina.wright@flexzone.example.com',
    startsAt: new Date('2026-06-20T11:00:00Z'),
    endsAt: new Date('2026-06-20T12:00:00Z'),
    capacity: 12,
    status: 'CANCELLED',
  },
];


export async function seedSessions(prisma: PrismaClient) {
  console.log('Seeding gym sessions...');

  let count = 0;
  for (const session of SESSIONS) {
    const gym = await prisma.gym.findFirst({
      where: { name: session.gymName },
    });
    if (!gym) {
      console.warn(`  Warning: Gym "${session.gymName}" not found. Skipping.`);
      continue;
    }

    let instructorId: string | null = null;
    if (session.instructorEmail) {
      const instructor = await prisma.instructor.findFirst({
        where: { gymId: gym.id, email: session.instructorEmail },
      });
      if (!instructor) {
        console.warn(
          `  Warning: Instructor ${session.instructorEmail} not found. Session will be unassigned.`,
        );
      } else {
        instructorId = instructor.id;
      }
    }

    await prisma.gymSession.create({
      data: {
        gymId: gym.id,
        title: session.title,
        description: session.description,
        instructorId,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
        capacity: session.capacity,
        status: session.status,
      },
    });

    console.log(
      `  Created session: "${session.title}" (${session.gymName}, ${session.status})`,
    );
    count++;
  }

  console.log(`Gym sessions seeded: ${count} total`);
}
