import { PrismaClient } from '../../src/generated/prisma/client';
import {
  legacySeedRepositoryIds,
  projectCatalog,
  technologySeeds,
} from './projectCatalog';
import { SeedObjectStorage } from './seedObjectStorage';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_IN_MS);
}

// Global pipeline reference for local vector embeddings
let extractor: any = null;

async function generateLocalEmbedding(text: string): Promise<number[]> {
  try {
    if (!extractor) {
      const { pipeline } = await (eval(
        'import("@xenova/transformers")',
      ) as Promise<typeof import('@xenova/transformers')>);
      extractor = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
      );
    }
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.warn('Could not generate local vector embedding:', error);
    return [];
  }
}

export async function seedProjects(
  prisma: PrismaClient,
  objectStorage: SeedObjectStorage,
) {
  console.log(
    'Seeding technologies, repositories, and showcase projects with vectors...',
  );

  // Remove legacy seed repos if re-running
  await prisma.repository.deleteMany({
    where: { githubRepoId: { in: legacySeedRepositoryIds } },
  });

  // 1. Seed Technologies
  const technologyIds = new Map<string, string>();

  for (const technology of technologySeeds) {
    const savedTechnology = await prisma.technology.upsert({
      where: { slug: technology.slug },
      update: {
        name: technology.name,
        category: technology.category,
      },
      create: technology,
    });
    technologyIds.set(technology.slug, savedTechnology.id);
  }

  // 2. Resolve Developers (Alex & Sarah)
  const developerEmails = [
    ...new Set(
      projectCatalog.flatMap((item) => [
        item.ownerEmail,
        ...(item.collaborators?.map((collaborator) => collaborator.email) ??
          []),
      ]),
    ),
  ];

  const developers = await prisma.user.findMany({
    where: { email: { in: developerEmails } },
    include: { developerProfile: true },
  });

  const developersByEmail = new Map(
    developers.map((developer) => [developer.email, developer]),
  );

  // 3. Seed Catalog Projects & Embeddings
  for (const item of projectCatalog) {
    const owner = developersByEmail.get(item.ownerEmail);
    if (!owner?.developerProfile?.githubUserId) {
      throw new Error(
        `Seed developer ${item.ownerEmail} must have a GitHub identity. Seed users first.`,
      );
    }

    const mediaKeyPrefix = `seed/${item.slug}/`;
    const [logoUrl, storedMedia] = await Promise.all([
      objectStorage.mirrorImage(item.logoSourceUrl, `${mediaKeyPrefix}logo`),
      Promise.all(
        item.media.map(async (media, index) => {
          const storageKey = `${mediaKeyPrefix}${index + 1}`;
          return {
            storageKey,
            publicUrl: await objectStorage.mirrorImage(
              media.sourceUrl,
              storageKey,
            ),
            caption: media.caption,
          };
        }),
      ),
    ]);

    // The catalog points to real public repositories. Demo ownership is
    // intentionally assigned to the seeded developers for portfolio content;
    // live GitHub import and collaborator verification still require OAuth.
    const repository = await prisma.repository.upsert({
      where: { githubRepoId: item.repository.githubRepoId },
      update: {
        fullName: item.repository.fullName,
        ownerLogin: item.repository.ownerLogin,
        ownerGithubUserId: item.repository.ownerGithubUserId,
        ownerType: item.repository.ownerType,
        repoName: item.repository.repoName,
        htmlUrl: item.repository.htmlUrl,
        isFork: false,
        defaultBranch: item.repository.defaultBranch,
        visibility: 'PUBLIC',
        lastSyncedAt: new Date(),
      },
      create: {
        ...item.repository,
        isFork: false,
        visibility: 'PUBLIC',
        lastSyncedAt: new Date(),
      },
    });

    const publishedAt = daysAgo(item.publishedDaysAgo);
    const project = await prisma.project.upsert({
      where: { repositoryId: repository.id },
      update: {
        createdByUserId: owner.id,
        title: item.title,
        slug: item.slug,
        logoUrl,
        shortDescription: item.shortDescription,
        fullDescription: item.fullDescription,
        deploymentUrl: item.deploymentUrl,
        status: 'PUBLISHED',
        githubOwnershipVerifiedAt: publishedAt,
        publishedAt,
        moderatedAt: null,
        moderationReason: null,
        moderatedByUserId: null,
      },
      create: {
        repositoryId: repository.id,
        createdByUserId: owner.id,
        title: item.title,
        slug: item.slug,
        logoUrl,
        shortDescription: item.shortDescription,
        fullDescription: item.fullDescription,
        deploymentUrl: item.deploymentUrl,
        status: 'PUBLISHED',
        githubOwnershipVerifiedAt: publishedAt,
        createdAt: daysAgo(item.publishedDaysAgo + 3),
        publishedAt,
      },
    });

    // --- Generate and attach pgvector Embedding ---
    const textToEmbed = `${item.title} ${item.shortDescription || ''} ${item.fullDescription || ''}`;
    const embedding = await generateLocalEmbedding(textToEmbed);

    if (embedding.length > 0) {
      const vectorString = JSON.stringify(embedding);
      await prisma.$executeRaw`
        UPDATE "Project"
        SET "embedding" = ${vectorString}::vector
        WHERE "id" = ${project.id}
      `;
    }

    // Upsert Owner Membership
    await prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId: project.id, userId: owner.id },
      },
      update: {
        githubUserId: owner.developerProfile.githubUserId,
        githubUsername: owner.developerProfile.githubUsername,
        role: 'OWNER',
        contributionRoleLabel: 'Project owner',
        contributionSummary:
          'Led product direction, architecture, and delivery for the project.',
        verificationStatus: 'VERIFIED',
        verificationSource: 'GITHUB_OWNER',
        verifiedAt: publishedAt,
        addedByUserId: owner.id,
      },
      create: {
        projectId: project.id,
        userId: owner.id,
        githubUserId: owner.developerProfile.githubUserId,
        githubUsername: owner.developerProfile.githubUsername,
        role: 'OWNER',
        contributionRoleLabel: 'Project owner',
        contributionSummary:
          'Led product direction, architecture, and delivery for the project.',
        verificationStatus: 'VERIFIED',
        verificationSource: 'GITHUB_OWNER',
        verifiedAt: publishedAt,
        addedByUserId: owner.id,
      },
    });

    // Upsert Collaborator Memberships
    for (const collaboratorSeed of item.collaborators ?? []) {
      const collaborator = developersByEmail.get(collaboratorSeed.email);
      if (!collaborator?.developerProfile?.githubUserId) {
        throw new Error(
          `Seed collaborator ${collaboratorSeed.email} must have a GitHub identity.`,
        );
      }

      await prisma.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: collaborator.id,
          },
        },
        update: {
          githubUserId: collaborator.developerProfile.githubUserId,
          githubUsername: collaborator.developerProfile.githubUsername,
          role: collaboratorSeed.role,
          contributionRoleLabel: collaboratorSeed.contributionRoleLabel,
          contributionSummary: collaboratorSeed.contributionSummary,
          githubPermission:
            collaboratorSeed.role === 'EDITOR' ? 'push' : 'pull',
          githubRoleName: collaboratorSeed.role === 'EDITOR' ? 'write' : 'read',
          verificationStatus: 'VERIFIED',
          verificationSource: 'GITHUB_COLLABORATOR',
          verifiedAt: publishedAt,
          addedByUserId: owner.id,
        },
        create: {
          projectId: project.id,
          userId: collaborator.id,
          githubUserId: collaborator.developerProfile.githubUserId,
          githubUsername: collaborator.developerProfile.githubUsername,
          role: collaboratorSeed.role,
          contributionRoleLabel: collaboratorSeed.contributionRoleLabel,
          contributionSummary: collaboratorSeed.contributionSummary,
          githubPermission:
            collaboratorSeed.role === 'EDITOR' ? 'push' : 'pull',
          githubRoleName: collaboratorSeed.role === 'EDITOR' ? 'write' : 'read',
          verificationStatus: 'VERIFIED',
          verificationSource: 'GITHUB_COLLABORATOR',
          verifiedAt: publishedAt,
          addedByUserId: owner.id,
        },
      });
    }

    // Sync Technologies
    await prisma.projectTechnology.deleteMany({
      where: { projectId: project.id },
    });
    await prisma.projectTechnology.createMany({
      data: item.techSlugs.map((slug, index) => {
        const technologyId = technologyIds.get(slug);
        if (!technologyId) {
          throw new Error(
            `Unknown technology slug "${slug}" for ${item.title}.`,
          );
        }
        return {
          projectId: project.id,
          technologyId,
          source: 'SCANNER' as const,
          evidence: `Detected from ${item.repository.fullName} repository metadata and source files.`,
          detectedAt: publishedAt,
          isPrimary: index < 4,
          sortOrder: index,
        };
      }),
    });

    // Sync Media
    await prisma.projectMedia.deleteMany({
      where: {
        projectId: project.id,
        storageKey: { startsWith: mediaKeyPrefix },
      },
    });
    if (storedMedia.length > 0) {
      await prisma.projectMedia.createMany({
        data: storedMedia.map((media, index) => ({
          projectId: project.id,
          uploadedByUserId: owner.id,
          mediaType: 'IMAGE' as const,
          storageKey: media.storageKey,
          publicUrl: media.publicUrl,
          caption: media.caption,
          sortOrder: index,
        })),
      });
    }

    console.log(
      `  [Vector Seeded] ${project.title} (Owner: ${item.ownerEmail})`,
    );
  }

  console.log(
    `Successfully seeded ${projectCatalog.length} projects with pgvector embeddings.`,
  );
}
