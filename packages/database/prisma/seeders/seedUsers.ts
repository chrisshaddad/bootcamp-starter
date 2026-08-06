/// <reference types="node" />
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaClient } from '../../src/generated/prisma/client';
import { SeedObjectStorage } from './seedObjectStorage';

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export async function seedUsers(
  prisma: PrismaClient,
  objectStorage: SeedObjectStorage,
) {
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
      headline: 'Senior Product Engineer · React, Next.js & Design Systems',
      bio: 'Product-focused full-stack engineer who turns complex workflows into fast, accessible experiences. Sarah enjoys building design systems, collaborative tools, and polished SaaS products with TypeScript.',
      location: 'San Francisco, California',
      profilePictureSourceUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=512&h=512&q=85',
    },
    {
      email: 'dev.alex@example.com',
      publicSlug: 'alex-koval',
      displayName: 'Alex Koval',
      githubUsername: 'alexkoval',
      githubUserId: BigInt(100002),
      headline: 'Staff Platform Engineer · APIs, Data & Infrastructure',
      bio: 'Backend and platform engineer specializing in resilient APIs, data-intensive systems, and developer infrastructure. Alex works across PostgreSQL, Redis, containers, queues, observability, and cloud delivery.',
      location: 'Berlin, Germany',
      profilePictureSourceUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=512&h=512&q=85',
    },
  ];

  for (const dev of devs) {
    const profilePictureUrl = await objectStorage.mirrorImage(
      dev.profilePictureSourceUrl,
      `seed/developers/${dev.publicSlug}/profile`,
    );
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
        profilePictureUrl,
        profilePictureOriginalUrl: profilePictureUrl,
        profilePictureCropZoom: 1,
        profilePictureCropX: 0,
        profilePictureCropY: 0,
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
        profilePictureUrl,
        profilePictureOriginalUrl: profilePictureUrl,
        profilePictureCropZoom: 1,
        profilePictureCropX: 0,
        profilePictureCropY: 0,
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
