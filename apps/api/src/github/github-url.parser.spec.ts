import { BadRequestException } from '@nestjs/common';
import { parseGithubRepositoryUrl } from './github-url.parser';

describe('parseGithubRepositoryUrl', () => {
  it('parses a canonical GitHub repository URL', () => {
    expect(parseGithubRepositoryUrl('https://github.com/vercel/next.js')).toEqual({
      owner: 'vercel',
      repo: 'next.js',
    });
  });

  it('normalizes a trailing slash', () => {
    expect(
      parseGithubRepositoryUrl('https://github.com/nestjs/nest/'),
    ).toEqual({
      owner: 'nestjs',
      repo: 'nest',
    });
  });

  it('normalizes a .git suffix', () => {
    expect(
      parseGithubRepositoryUrl('https://github.com/openai/openai-node.git'),
    ).toEqual({
      owner: 'openai',
      repo: 'openai-node',
    });
  });

  it.each([
    'https://gitlab.com/owner/repo',
    'http://github.com/owner/repo',
    'https://github.com/owner',
    'https://github.com/owner/repo/issues',
    'https://github.com/owner/repo/pull/1',
    'https://github.com/owner/repo/tree/main',
    'https://github.com/owner/repo/blob/main/README.md',
    'https://github.com/owner/repo?tab=readme',
    'not-a-url',
  ])('rejects unsupported URL %s', (repositoryUrl) => {
    expect(() => parseGithubRepositoryUrl(repositoryUrl)).toThrow(
      BadRequestException,
    );
  });
});
