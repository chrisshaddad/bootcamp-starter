import {
  importGithubProjectRequestSchema,
  importGithubProjectResponseSchema,
} from '@repo/contracts';

describe('importGithubProjectRequestSchema', () => {
  it('accepts a GitHub URL without optional project fields', () => {
    expect(
      importGithubProjectRequestSchema.safeParse({
        repositoryUrl: 'https://github.com/vercel/next.js',
      }).success,
    ).toBe(true);
  });

  it('accepts the supported optional project fields', () => {
    expect(
      importGithubProjectRequestSchema.safeParse({
        repositoryUrl: 'https://github.com/vercel/next.js',
        title: 'Next.js',
        shortDescription: 'The React Framework',
        fullDescription: 'A longer project description.',
        deploymentUrl: 'https://nextjs.org',
      }).success,
    ).toBe(true);
  });

  it.each([
    { repositoryUrl: 'not-a-url' },
    { repositoryUrl: 'https://github.com/vercel/next.js', title: '   ' },
    {
      repositoryUrl: 'https://github.com/vercel/next.js',
      deploymentUrl: 'not-a-url',
    },
  ])('rejects invalid import request %#', (request) => {
    expect(importGithubProjectRequestSchema.safeParse(request).success).toBe(
      false,
    );
  });

  it('rejects unknown fields', () => {
    expect(
      importGithubProjectRequestSchema.safeParse({
        repositoryUrl: 'https://github.com/vercel/next.js',
        status: 'PUBLISHED',
      }).success,
    ).toBe(false);
  });

  it('accepts the persisted import response shape', () => {
    expect(
      importGithubProjectResponseSchema.safeParse({
        project: {
          id: '00000000-0000-4000-8000-000000000003',
          title: 'Next.js',
          slug: 'next-js',
          status: 'DRAFT',
          shortDescription: 'The React Framework',
          fullDescription: null,
          deploymentUrl: null,
          createdAt: '2026-07-10T10:00:00.000Z',
          updatedAt: '2026-07-10T10:00:00.000Z',
          repository: {
            id: '00000000-0000-4000-8000-000000000002',
            githubRepoId: '70107786',
            fullName: 'vercel/next.js',
            ownerLogin: 'vercel',
            repoName: 'next.js',
            htmlUrl: 'https://github.com/vercel/next.js',
            defaultBranch: 'canary',
            visibility: 'PUBLIC',
            lastPushedAt: '2026-07-09T10:00:00.000Z',
            lastSyncedAt: '2026-07-10T10:00:00.000Z',
          },
          technologies: [
            {
              id: '00000000-0000-4000-8000-000000000004',
              name: 'React',
              slug: 'react',
              category: 'FRAMEWORK',
              source: 'SCANNER',
              evidence: 'Detected dependency "react" in package.json',
              detectedAt: '2026-07-10T10:00:00.000Z',
            },
          ],
        },
      }).success,
    ).toBe(true);
  });
});
