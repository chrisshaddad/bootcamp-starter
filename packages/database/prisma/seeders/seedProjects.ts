import { PrismaClient } from '../../src/generated/prisma/client';

let extractor: any = null;

async function generateLocalEmbedding(text: string): Promise<number[]> {
  try {
    if (!extractor) {
      const { pipeline } = await (eval('import("@xenova/transformers")') as Promise<
        typeof import('@xenova/transformers')
      >);
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.warn('Could not generate local vector embedding:', error);
    return [];
  }
}

export async function seedProjects(prisma: PrismaClient) {
  console.log('Seeding technologies, repositories, and projects...');

  // 1. Seed Technologies
  const technologies = [
    { name: 'TypeScript', slug: 'typescript', category: 'LANGUAGE' as const },
    { name: 'Node.js', slug: 'nodejs', category: 'LANGUAGE' as const },
    { name: 'Python', slug: 'python', category: 'LANGUAGE' as const },
    { name: 'Dart', slug: 'dart', category: 'LANGUAGE' as const },
    { name: 'NestJS', slug: 'nestjs', category: 'FRAMEWORK' as const },
    { name: 'Next.js', slug: 'nextjs', category: 'FRAMEWORK' as const },
    { name: 'Flutter', slug: 'flutter', category: 'FRAMEWORK' as const },
    { name: 'PyTorch', slug: 'pytorch', category: 'LIBRARY' as const },
    { name: 'Three.js', slug: 'threejs', category: 'LIBRARY' as const },
    { name: 'PostgreSQL', slug: 'postgresql', category: 'DATABASE' as const },
    { name: 'Redis', slug: 'redis', category: 'DATABASE' as const },
    { name: 'Docker', slug: 'docker', category: 'DEVOPS' as const },
  ];

  const techMap: Record<string, string> = {};

  for (const tech of technologies) {
    const createdTech = await prisma.technology.upsert({
      where: { slug: tech.slug },
      update: {},
      create: tech,
    });
    techMap[tech.slug] = createdTech.id;
  }

  // 2. Fetch developer user
  const devUser = await prisma.user.findUnique({
    where: { email: 'dev.sarah@example.com' },
  });

  if (!devUser) {
    throw new Error(
      'No developer found with email dev.sarah@example.com. Seed users first.',
    );
  }
  const devProfile = await prisma.developerProfile.findUnique({
    where: { userId: devUser.id },
  });
  if (!devProfile?.githubUserId || !devProfile.githubUsername) {
    throw new Error('Seed developer must have a GitHub identity.');
  }

  // 3. Seed Distinct Repositories and Projects
  const reposAndProjects = [
    {
      githubRepoId: BigInt(83921102),
      fullName: 'sarahchen/enterprise-nest-api',
      ownerLogin: 'sarahchen',
      repoName: 'enterprise-nest-api',
      htmlUrl: 'https://github.com/sarahchen/enterprise-nest-api',
      defaultBranch: 'main',
      title: 'Enterprise NestJS Boilerplate',
      slug: 'enterprise-nestjs-boilerplate',
      shortDescription:
        'A production-ready NestJS API boilerplate with advanced caching and background workers.',
      fullDescription:
        'This project demonstrates industry-grade patterns for Node.js, leveraging PostgreSQL with Prisma, Redis with BullMQ, and Docker containerization. It contains robust logging and modular architecture principles.',
      deploymentUrl: 'https://api-demo.sarahchen.dev',
      status: 'PUBLISHED' as const,
      techSlugs: ['typescript', 'nodejs', 'nestjs', 'postgresql', 'redis', 'docker'],
    },
    {
      githubRepoId: BigInt(94301292),
      fullName: 'sarahchen/tailwindcss-v4-playground',
      ownerLogin: 'sarahchen',
      repoName: 'tailwindcss-v4-playground',
      htmlUrl: 'https://github.com/sarahchen/tailwindcss-v4-playground',
      defaultBranch: 'main',
      title: 'Tailwind v4 Sandbox',
      slug: 'tailwindcss-v4-sandbox',
      shortDescription:
        'An experimental Next.js layout showcasing Tailwind CSS v4 features.',
      fullDescription:
        'Explore the new compilation engine, custom utilities, and CSS-first configuration features of Tailwind v4 inside a modern Next.js App Router interface.',
      deploymentUrl: 'https://tailwind4.sarahchen.dev',
      status: 'PUBLISHED' as const,
      techSlugs: ['typescript', 'nextjs'],
    },
    {
      githubRepoId: BigInt(55410191),
      fullName: 'sarahchen/vision-object-detector',
      ownerLogin: 'sarahchen',
      repoName: 'vision-object-detector',
      htmlUrl: 'https://github.com/sarahchen/vision-object-detector',
      defaultBranch: 'main',
      title: 'Realtime AI Vision Pipeline',
      slug: 'realtime-ai-vision-pipeline',
      shortDescription:
        'Deep learning computer vision system for real-time video stream object classification.',
      fullDescription:
        'Powered by PyTorch and Python, this computer vision pipeline analyzes live camera feeds to detect objects, track movements, and compute confidence scores using neural network models.',
      deploymentUrl: 'https://vision-demo.sarahchen.dev',
      status: 'PUBLISHED' as const,
      techSlugs: ['python', 'pytorch'],
    },
    {
      githubRepoId: BigInt(66201948),
      fullName: 'sarahchen/galaxy-procedural-3d',
      ownerLogin: 'sarahchen',
      repoName: 'galaxy-procedural-3d',
      htmlUrl: 'https://github.com/sarahchen/galaxy-procedural-3d',
      defaultBranch: 'main',
      title: 'Procedural 3D Galaxy Engine',
      slug: 'procedural-3d-galaxy-engine',
      shortDescription:
        'An interactive WebGL space simulation rendering infinite procedurally generated planets.',
      fullDescription:
        'Built with Three.js and custom GLSL particle shaders. Features real-time orbital physics, dynamic atmospheric lighting, and smooth WebGL canvas rendering.',
      deploymentUrl: 'https://galaxy.sarahchen.dev',
      status: 'PUBLISHED' as const,
      techSlugs: ['typescript', 'threejs'],
    },
    {
      githubRepoId: BigInt(77192039),
      fullName: 'sarahchen/pulse-health-tracker',
      ownerLogin: 'sarahchen',
      repoName: 'pulse-health-tracker',
      htmlUrl: 'https://github.com/sarahchen/pulse-health-tracker',
      defaultBranch: 'main',
      title: 'Pulse Mobile Fitness App',
      slug: 'pulse-mobile-fitness-app',
      shortDescription:
        'Cross-platform mobile application for tracking heart rate and daily workout metrics.',
      fullDescription:
        'Written in Dart and Flutter, this mobile app connects via Bluetooth Low Energy (BLE) to smartwatches to stream live heart rate data and generate biometric fitness insights.',
      deploymentUrl: 'https://pulse.sarahchen.dev',
      status: 'PUBLISHED' as const,
      techSlugs: ['dart', 'flutter'],
    },
  ];

  for (const item of reposAndProjects) {
    const repo = await prisma.repository.upsert({
      where: { githubRepoId: item.githubRepoId },
      update: {
        ownerGithubUserId: devProfile.githubUserId,
        ownerType: 'User',
        isFork: false,
      },
      create: {
        githubRepoId: item.githubRepoId,
        fullName: item.fullName,
        ownerLogin: item.ownerLogin,
        ownerGithubUserId: devProfile.githubUserId,
        ownerType: 'User',
        repoName: item.repoName,
        htmlUrl: item.htmlUrl,
        defaultBranch: item.defaultBranch,
        visibility: 'PUBLIC',
        isFork: false,
      },
    });

    const project = await prisma.project.upsert({
      where: { repositoryId: repo.id },
      update: {
        createdByUserId: devUser.id,
        title: item.title,
        slug: item.slug,
        shortDescription: item.shortDescription,
        fullDescription: item.fullDescription,
        deploymentUrl: item.deploymentUrl,
        status: item.status,
        githubOwnershipVerifiedAt: new Date(),
      },
      create: {
        repositoryId: repo.id,
        createdByUserId: devUser.id,
        title: item.title,
        slug: item.slug,
        shortDescription: item.shortDescription,
        fullDescription: item.fullDescription,
        deploymentUrl: item.deploymentUrl,
        status: item.status,
        githubOwnershipVerifiedAt: new Date(),
      },
    });

    // Generate and save 384-dim Vector Embedding
    const textToEmbed = `${item.title} ${item.shortDescription || ''} ${item.fullDescription || ''}`;
    const embedding = await generateLocalEmbedding(textToEmbed);
    if (embedding.length > 0) {
      const vectorString = JSON.stringify(embedding);
      await prisma.$executeRaw`
        UPDATE "Project"
        SET embedding = ${vectorString}::vector
        WHERE id = ${project.id}
      `;
    }

    await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: project.id, userId: devUser.id },
      },
      update: {
        githubUserId: devProfile.githubUserId,
        githubUsername: devProfile.githubUsername,
        role: 'OWNER',
        verificationStatus: 'VERIFIED',
        verificationSource: 'GITHUB_OWNER',
        verifiedAt: new Date(),
      },
      create: {
        projectId: project.id,
        userId: devUser.id,
        githubUserId: devProfile.githubUserId,
        githubUsername: devProfile.githubUsername,
        role: 'OWNER',
        verificationStatus: 'VERIFIED',
        verificationSource: 'GITHUB_OWNER',
        verifiedAt: new Date(),
        addedByUserId: devUser.id,
      },
    });

    await prisma.projectTechnology.deleteMany({
      where: { projectId: project.id },
    });

    for (const slug of item.techSlugs) {
      const techId = techMap[slug];
      if (techId) {
        await prisma.projectTechnology.create({
          data: {
            projectId: project.id,
            technologyId: techId,
            source: 'MANUAL',
            isPrimary: true,
          },
        });
      }
    }
    console.log(`  Created/Updated project with vector: ${project.title}`);
  }

  console.log('5 Distinct projects seeded with vectors.');
}