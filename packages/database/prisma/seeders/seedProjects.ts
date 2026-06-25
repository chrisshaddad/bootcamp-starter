import { PrismaClient } from '../../src/generated/prisma/client';

export async function seedProjects(prisma: PrismaClient) {
  console.log('Seeding technologies, repositories, and projects...');

  // 1. Seed Technologies
  const technologies = [
    { name: 'TypeScript', slug: 'typescript', category: 'LANGUAGE' as const },
    { name: 'Node.js', slug: 'nodejs', category: 'LANGUAGE' as const },
    { name: 'NestJS', slug: 'nestjs', category: 'FRAMEWORK' as const },
    { name: 'Next.js', slug: 'nextjs', category: 'FRAMEWORK' as const },
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

  // 2. Fetch a developer user to create projects
  const devUser = await prisma.user.findFirst({
    where: { accountType: 'DEVELOPER' },
  });

  if (!devUser) {
    throw new Error('No developer found. Seed users first.');
  }

  // 3. Seed Repository and Project
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
      techSlugs: [
        'typescript',
        'nodejs',
        'nestjs',
        'postgresql',
        'redis',
        'docker',
      ],
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
        'Explore the new compilation engine, custom utilities, and CSS-first configuration features of Tailwind v4 inside a modern Next.js 16 App Router interface.',
      deploymentUrl: 'https://tailwind4.sarahchen.dev',
      status: 'PUBLISHED' as const,
      techSlugs: ['typescript', 'nextjs'],
    },
  ];

  for (const item of reposAndProjects) {
    // Upsert Repository
    const repo = await prisma.repository.upsert({
      where: { githubRepoId: item.githubRepoId },
      update: {},
      create: {
        githubRepoId: item.githubRepoId,
        fullName: item.fullName,
        ownerLogin: item.ownerLogin,
        repoName: item.repoName,
        htmlUrl: item.htmlUrl,
        defaultBranch: item.defaultBranch,
        visibility: 'PUBLIC',
      },
    });

    // Create Project
    const project = await prisma.project.create({
      data: {
        repositoryId: repo.id,
        createdByUserId: devUser.id,
        title: item.title,
        slug: item.slug,
        shortDescription: item.shortDescription,
        fullDescription: item.fullDescription,
        deploymentUrl: item.deploymentUrl,
        status: item.status,
      },
    });

    // Link Technologies
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
    console.log(`  Created project: ${project.title} (${project.status})`);
  }

  console.log('Technologies, repositories, and projects seeded.');
}
