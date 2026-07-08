/// <reference types="node" />
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export async function seedUsers(prisma: PrismaClient) {
  const defaultPassword = 'Password123!';
  console.log('Seeding users and profiles...');

  // 1. Super Admin
  await prisma.user.upsert({
    where: { email: 'admin@bootcamp-starter.local' },
    update: {},
    create: {
      email: 'admin@bootcamp-starter.local',
      passwordHash: hashPassword(defaultPassword),
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
      githubUsername: 'sarahchen',
      githubUserId: BigInt(100001),
      headline: 'Senior Full Stack Developer',
      bio: 'Specialist in building highly scalable React & Node.js applications with Turborepos.',
      location: 'San Francisco, CA',
    },
    {
      email: 'dev.alex@example.com',
      publicSlug: 'alex-koval',
      displayName: 'Alex Koval',
      githubUsername: 'alexkoval',
      githubUserId: BigInt(100002),
      headline: 'DevOps & Backend Engineer',
      bio: 'Passionate about Docker orchestration, Postgres performance tuning, and Redis caching systems.',
      location: 'Berlin, Germany',
    },
  ];

  for (const dev of devs) {
    const user = await prisma.user.upsert({
      where: { email: dev.email },
      update: {
        accountType: 'DEVELOPER',
        isConfirmed: true,
      },
      create: {
        email: dev.email,
        passwordHash: hashPassword(defaultPassword),
        accountType: 'DEVELOPER',
        isConfirmed: true,
      },
    });

    await prisma.developerProfile.upsert({
      where: { userId: user.id },
      update: {
        publicSlug: dev.publicSlug,
        displayName: dev.displayName,
        githubUsername: dev.githubUsername,
        githubUserId: dev.githubUserId,
        headline: dev.headline,
        bio: dev.bio,
        location: dev.location,
      },
      create: {
        userId: user.id,
        publicSlug: dev.publicSlug,
        displayName: dev.displayName,
        githubUsername: dev.githubUsername,
        githubUserId: dev.githubUserId,
        headline: dev.headline,
        bio: dev.bio,
        location: dev.location,
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
        passwordHash: hashPassword(defaultPassword),
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
