import { PrismaClient } from '../../src/generated/prisma/client';

interface GymSeed {
  name: string;
  description: string;
  phone: string;
  address: string;
  website: string | null;
  maxCapacity: number | null;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED' | 'INACTIVE';
  statusReason?: string;
  createdAt: Date;
  approvedAt?: Date;
  adminEmail: string;
}

const GYMS: GymSeed[] = [
  {
    name: 'Iron Peak Fitness',
    description:
      'Premier strength and conditioning gym offering personal training, group classes, and state-of-the-art equipment.',
    phone: '+1-555-0101',
    address: '12 Barbell Ave, Chicago, IL 60601',
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
    phone: '+1-555-0102',
    address: '88 Flex Street, Austin, TX 78701',
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
    phone: '+1-555-0103',
    address: '5 Summit Road, Denver, CO 80202',
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
    phone: '+1-555-0104',
    address: '200 Ring Lane, New York, NY 10001',
    website: 'https://cityboxing.example.com',
    maxCapacity: null,
    status: 'PENDING',
    createdAt: new Date('2026-01-28'),
    adminEmail: 'admin@cityboxing.example.com',
  },
  {
    name: 'Velocity Sports',
    description:
      'High-performance sports training facility focusing on speed, agility, and athletic conditioning.',
    phone: '+1-555-0105',
    address: '300 Sprint Blvd, Miami, FL 33101',
    website: null,
    maxCapacity: null,
    status: 'REJECTED',
    statusReason:
      'Unable to verify business registration documents submitted with the application.',
    createdAt: new Date('2025-12-10'),
    adminEmail: 'admin@velocitysports.example.com',
  },
  {
    name: 'ProFit Training',
    description:
      'Boutique bodybuilding and powerlifting gym with specialised coaching and competition prep programs.',
    phone: '+1-555-0106',
    address: '74 Iron Court, Seattle, WA 98101',
    website: 'https://profitraining.example.com',
    maxCapacity: 80,
    status: 'SUSPENDED',
    statusReason:
      'Facility safety inspection flagged non-compliant emergency exit signage. Suspended pending remediation.',
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
        phone: gym.phone,
        address: gym.address,
        website: gym.website,
        maxCapacity: gym.maxCapacity,
        status: gym.status,
        statusReason: gym.statusReason ?? null,
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
