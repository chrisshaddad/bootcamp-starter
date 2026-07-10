import { importGithubProjectRequestSchema } from '@repo/contracts';

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
});
