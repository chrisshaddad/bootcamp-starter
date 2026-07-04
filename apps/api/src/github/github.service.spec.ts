import {
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GithubService } from './github.service';

const originalFetch = global.fetch;

describe('GithubService', () => {
  let service: GithubService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new GithubService();
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
    delete process.env.GITHUB_TOKEN;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('normalizes repository metadata and language byte counts', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 123456789,
          full_name: 'vercel/next.js',
          owner: { login: 'vercel' },
          name: 'next.js',
          html_url: 'https://github.com/vercel/next.js',
          default_branch: 'canary',
          private: false,
          visibility: 'public',
          description: null,
          pushed_at: null,
          language: null,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          TypeScript: 123456,
          CSS: 12345,
        }),
      );

    const preview = await service.previewRepository(
      'https://github.com/vercel/next.js',
    );

    expect(preview).toEqual({
      repository: {
        githubRepoId: '123456789',
        fullName: 'vercel/next.js',
        ownerLogin: 'vercel',
        repoName: 'next.js',
        htmlUrl: 'https://github.com/vercel/next.js',
        defaultBranch: 'canary',
        isPrivate: false,
        visibility: 'PUBLIC',
        description: null,
        lastPushedAt: null,
        primaryLanguage: null,
      },
      languages: [
        { name: 'TypeScript', bytes: 123456 },
        { name: 'CSS', bytes: 12345 },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.github.com/repos/vercel/next.js',
    );
    expect(getFetchHeaders(fetchMock)).not.toHaveProperty('Authorization');
  });

  it('uses GITHUB_TOKEN as an optional authorization header when present', async () => {
    process.env.GITHUB_TOKEN = 'test-token';
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: '987654321',
          full_name: 'openai/openai-node',
          owner: { login: 'openai' },
          name: 'openai-node',
          html_url: 'https://github.com/openai/openai-node',
          default_branch: 'master',
          private: false,
          visibility: 'public',
          description: 'Node SDK',
          pushed_at: '2026-07-04T00:00:00Z',
          language: 'TypeScript',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ TypeScript: 10 }));

    await service.previewRepository('https://github.com/openai/openai-node');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.github.com/repos/openai/openai-node',
    );
    expect(getFetchHeaders(fetchMock).Authorization).toBe('Bearer test-token');
  });

  it('maps GitHub 404 responses to the safe inaccessible repository message', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Not Found' }, 404),
    );

    const preview = service.previewRepository('https://github.com/owner/repo');

    await expect(preview).rejects.toThrow(NotFoundException);
    await expect(preview).rejects.toThrow(
      'Repository not found, private, or inaccessible.',
    );
  });

  it('rejects explicitly private repository metadata', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        id: 123,
        full_name: 'owner/private-repo',
        owner: { login: 'owner' },
        name: 'private-repo',
        html_url: 'https://github.com/owner/private-repo',
        default_branch: 'main',
        private: true,
        visibility: 'private',
        description: null,
        pushed_at: null,
        language: null,
      }),
    );

    await expect(
      service.previewRepository('https://github.com/owner/private-repo'),
    ).rejects.toThrow(ForbiddenException);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('maps GitHub rate limits to service unavailable', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'API rate limit exceeded' }, 403, {
        'x-ratelimit-remaining': '0',
      }),
    );

    await expect(
      service.previewRepository('https://github.com/owner/repo'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps network failures to service unavailable', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network failed'));

    await expect(
      service.previewRepository('https://github.com/owner/repo'),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers,
  });
}

function getFetchHeaders(
  fetchMock: jest.MockedFunction<typeof fetch>,
): Record<string, string> {
  const requestInit = fetchMock.mock.calls[0]?.[1];

  if (!isRecord(requestInit)) {
    throw new Error('Expected fetch options to be provided');
  }

  const headers = requestInit.headers;
  if (!isStringRecord(headers)) {
    throw new Error('Expected fetch headers to be a string record');
  }

  return headers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((item) => typeof item === 'string')
  );
}
