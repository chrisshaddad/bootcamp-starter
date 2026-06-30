import { PrismaClient } from '../../src/generated/prisma/client';

interface InstructorSeed {
  gymName: string;
  name: string;
  email: string | null;
  specialization: string | null;
  isActive: boolean;
}

const INSTRUCTORS: InstructorSeed[] = [
  // Iron Peak Fitness
  {
    gymName: 'Iron Peak Fitness',
    name: 'Marcus Reed',
    email: 'marcus.reed@ironpeak.example.com',
    specialization: 'Strength & Conditioning',
    isActive: true,
  },
  {
    gymName: 'Iron Peak Fitness',
    name: 'Lisa Park',
    email: 'lisa.park@ironpeak.example.com',
    specialization: 'Yoga & Mobility',
    isActive: true,
  },
  // FlexZone Gym
  {
    gymName: 'FlexZone Gym',
    name: 'Carlos Diaz',
    email: 'carlos.diaz@flexzone.example.com',
    specialization: 'CrossFit',
    isActive: true,
  },
  {
    gymName: 'FlexZone Gym',
    name: 'Nina Wright',
    email: 'nina.wright@flexzone.example.com',
    specialization: 'Pilates',
    isActive: true,
  },
  {
    gymName: 'FlexZone Gym',
    name: 'Tom Bradley',
    email: null,
    specialization: 'HIIT',
    isActive: false, // no longer active
  },
  // ProFit Training (suspended gym, but instructors still in DB)
  {
    gymName: 'ProFit Training',
    name: 'Chris Kane',
    email: 'chris.kane@profitraining.example.com',
    specialization: 'Bodybuilding',
    isActive: true,
  },
];


export async function seedInstructors(prisma: PrismaClient) {
  console.log('Seeding instructors...');

  let count = 0;
  for (const instructor of INSTRUCTORS) {
    const gym = await prisma.gym.findFirst({
      where: { name: instructor.gymName },
    });

    if (!gym) {
      console.warn(
        `  Warning: Gym "${instructor.gymName}" not found. Skipping instructor ${instructor.name}.`,
      );
      continue;
    }

    await prisma.instructor.create({
      data: {
        gymId: gym.id,
        name: instructor.name,
        email: instructor.email,
        specialization: instructor.specialization,
        isActive: instructor.isActive,
      },
    });

    console.log(
      `  Created instructor: ${instructor.name} (${instructor.gymName})`,
    );
    count++;
  }

  console.log(`Instructors seeded: ${count} total`);
}
