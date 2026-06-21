import { PrismaClient } from '../../src/generated/prisma/client';

interface GymSeed {
  name: string;
  description: string;
  website: string | null;
  maxCapacity: number | null;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'INACTIVE';
  createdAt: Date;
  approvedAt?: Date;
  adminEmail: string;
}

const GYMS: GymSeed[] = [
  {
    name: 'Iron Peak Fitness',
    description:
      'Premier strength and conditioning gym offering personal training, group classes, and state-of-the-art equipment.',
    website: 'https://ironpeak.example.com',
    maxCapacity: 150,
    status: 'ACTIVE',
    createdAt: new Date('2025-10-15'),
    approvedAt: new Date('2025-10-18'),
    adminEmail: 'admin@ironpeak.example.com',
  },
  {
    name: 'FlexZone Gym',
    description:
      'Modern functional fitness studio specialising in CrossFit, HIIT, and mobility training for all levels.',
    website: 'https://flexzone.example.com',
    maxCapacity: 200,
    status: 'ACTIVE',
    createdAt: new Date('2025-11-01'),
    approvedAt: new Date('2025-11-03'),
    adminEmail: 'admin@flexzone.example.com',
  },
  {
    name: 'Mountain Wellness Center',
    description:
      'Holistic wellness facility combining yoga, meditation, and gentle fitness for mind-body balance.',
    website: 'https://mountainwellness.example.com',
    maxCapacity: null,
    status: 'PENDING',
    createdAt: new Date('2026-01-20'),
    adminEmail: 'admin@mountainwellness.example.com',
  },
  {
    name: 'City Boxing Club',
    description:
      'Boxing and martial arts gym offering beginner-friendly classes through to competitive training.',
    website: 'https://cityboxing.example.com',
    maxCapacity: null,
    status: 'PENDING',
    createdAt: new Date('2026-01-28'),
    adminEmail: 'admin@cityboxing.example.com',
  },
  {
    name: 'Velocity Sports',
    description:
      'Application rejected due to failure to provide verifiable business registration documents.',
    website: null,
    maxCapacity: null,
    status: 'REJECTED',
    createdAt: new Date('2025-12-10'),
    adminEmail: 'admin@velocitysports.example.com',
  },
  {
    name: 'ProFit Training',
    description:
      'Boutique bodybuilding and powerlifting gym. Currently suspended pending facility safety inspection.',
    website: 'https://profitraining.example.com',
    maxCapacity: 80,
    status: 'SUSPENDED',
    createdAt: new Date('2025-09-05'),
    approvedAt: new Date('2025-09-08'),
    adminEmail: 'admin@profitraining.example.com',
  },
];

export async function seedGyms(prisma: PrismaClient) {
  console.log('Seeding gyms...');

  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
  });

  if (!superAdmin) {
    throw new Error('No super admin found. Seed super admins first.');
  }

  let count = 0;
  for (const gym of GYMS) {
    const gymAdmin = await prisma.user.findUnique({
      where: { email: gym.adminEmail },
    });

    if (!gymAdmin) {
      console.warn(
        `  Warning: Gym admin ${gym.adminEmail} not found. Skipping ${gym.name}.`,
      );
      continue;
    }

    const createdGym = await prisma.gym.create({
      data: {
        name: gym.name,
        description: gym.description,
        website: gym.website,
        maxCapacity: gym.maxCapacity,
        status: gym.status,
        createdAt: gym.createdAt,
        createdById: gymAdmin.id,
        approvedById:
          gym.status === 'ACTIVE' || gym.status === 'SUSPENDED'
            ? superAdmin.id
            : null,
        approvedAt: gym.approvedAt ?? null,
      },
    });

    await prisma.user.update({
      where: { id: gymAdmin.id },
      data: { gymId: createdGym.id },
    });

    console.log(
      `  Created gym: ${gym.name} (${gym.status}) - Admin: ${gymAdmin.email}`,
    );
    count++;
  }

  console.log(`Gyms seeded: ${count} total`);
}
