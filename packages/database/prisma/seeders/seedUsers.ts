import { PrismaClient } from '../../src/generated/prisma/client';

export async function seedUsers(prisma: PrismaClient) {
  console.log('Seeding users and profiles...');

  // 1. Super Admin
  await prisma.user.upsert({
    where: { email: 'admin@bootcamp-starter.local' },
    update: {},
    create: {
      email: 'admin@bootcamp-starter.local',
      passwordHash: 'dummy_hash',
      accountType: 'SUPER_ADMIN',
      isConfirmed: true,
    },
  });

  // 2. Developer Users with Profiles
  const devs = [
    {
      email: 'dev.sarah@example.com',
      publicSlug: 'sarah-chen',
      displayName: 'Sarah Chen',
      headline: 'Senior Full Stack Developer',
      bio: 'Specialist in building highly scalable React & Node.js applications with Turborepos.',
      location: 'San Francisco, CA',
    },
    {
      email: 'dev.alex@example.com',
      publicSlug: 'alex-koval',
      displayName: 'Alex Koval',
      headline: 'DevOps & Backend Engineer',
      bio: 'Passionate about Docker orchestration, Postgres performance tuning, and Redis caching systems.',
      location: 'Berlin, Germany',
    },
  ];

  for (const dev of devs) {
    await prisma.user.upsert({
      where: { email: dev.email },
      update: {},
      create: {
        email: dev.email,
        passwordHash: 'dummy_hash',
        accountType: 'DEVELOPER',
        isConfirmed: true,
        developerProfile: {
          create: {
            publicSlug: dev.publicSlug,
            displayName: dev.displayName,
            headline: dev.headline,
            bio: dev.bio,
            location: dev.location,
          },
        },
      },
    });
  }

  // 3. Hiring Managers with Profiles
  const hiringManagers = [
    {
      email: 'hiring.watson@example.com',
      organizationName: 'HealthFirst Medical Group',
      organizationType: 'COMPANY' as const,
      jobTitle: 'VP of Engineering',
      organizationWebsiteUrl: 'https://healthfirst.example.com',
    },
    {
      email: 'hiring.green@example.com',
      organizationName: 'Green Energy Partners',
      organizationType: 'AGENCY' as const,
      jobTitle: 'Lead Recruiter',
      organizationWebsiteUrl: 'https://greenenergy.example.com',
    },
  ];

  for (const hm of hiringManagers) {
    await prisma.user.upsert({
      where: { email: hm.email },
      update: {},
      create: {
        email: hm.email,
        passwordHash: 'dummy_hash',
        accountType: 'HIRING',
        isConfirmed: true,
        hiringProfile: {
          create: {
            organizationName: hm.organizationName,
            organizationType: hm.organizationType,
            jobTitle: hm.jobTitle,
            organizationWebsiteUrl: hm.organizationWebsiteUrl,
          },
        },
      },
    });
  }

  console.log('Users and profiles seeded.');
}