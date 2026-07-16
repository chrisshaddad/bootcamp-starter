import {
  ConflictException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { DatabaseService } from '../database/prisma.service';
import { GithubRequestTimeoutException, GithubService } from './github.service';

const originalFetch = global.fetch;

type ConnectedAccountUpdateArgs = {
  where: { userId: string };
  data: { githubAccessToken?: string };
};

describe('GithubService', () => {
  let service: GithubService;
  let fetchMock: jest.MockedFunction<typeof fetch>;
  let db: {
    connectedAccount: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock<unknown, [ConnectedAccountUpdateArgs]>;
    };
    developerProfile: { update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(() => {
    db = {
      connectedAccount: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn<unknown, [ConnectedAccountUpdateArgs]>(),
      },
      developerProfile: { update: jest.fn() },
      $transaction: jest.fn(),
    };
    service = new GithubService(db as unknown as DatabaseService);
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = fetchMock;
    delete process.env.GITHUB_TOKEN;
    process.env.GITHUB_CLIENT_ID = 'client-id';
    process.env.GITHUB_CLIENT_SECRET = 'client-secret';
    process.env.GITHUB_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString(
      'base64',
    );
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GITHUB_CLIENT_ID;
    delete process.env.GITHUB_CLIENT_SECRET;
    delete process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  });

  it('encrypts an OAuth token before saving it', async () => {
    mockOAuthState(db);
    mockSuccessfulGithubOAuth(fetchMock);
    db.developerProfile.update.mockReturnValue({});
    db.connectedAccount.update.mockReturnValue({});
    db.$transaction.mockResolvedValue([]);

    await service.handleOAuthCallback('user-id', 'authorization-code', 'state');

    const savedToken =
      db.connectedAccount.update.mock.calls[0]?.[0]?.data.githubAccessToken;
    expect(typeof savedToken).toBe('string');
    if (typeof savedToken !== 'string') {
      throw new Error('Expected the GitHub token to be saved as a string.');
    }

    expect(savedToken).toMatch(/^v1:/);
    expect(savedToken).not.toContain('oauth-access-token');
  });

  it("uses the current user's decrypted token for repository requests", async () => {
    const encryptedToken = (
      service as unknown as {
        encryptGithubAccessToken: (token: string) => string;
      }
    ).encryptGithubAccessToken('user-specific-token');
    db.connectedAccount.findUnique.mockResolvedValue({
      githubAccessToken: encryptedToken,
    });
    fetchMock.mockResolvedValueOnce(jsonResponse([]));

    await service.getUserRepositories('user-id');

    expect(getFetchHeaders(fetchMock).Authorization).toBe(
      'Bearer user-specific-token',
    );
  });

  it('returns a conflict when a GitHub account is connected to another user', async () => {
    mockOAuthState(db);
    mockSuccessfulGithubOAuth(fetchMock);
    db.developerProfile.update.mockReturnValue({});
    db.connectedAccount.update.mockReturnValue({});
    db.$transaction.mockRejectedValue(
      Object.assign(new Error('Duplicate'), {
        code: 'P2002',
      }),
    );

    try {
      await service.handleOAuthCallback(
        'user-id',
        'authorization-code',
        'state',
      );
      fail('Expected the OAuth callback to throw a conflict.');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect(error).toHaveProperty(
        'message',
        'This GitHub account is already connected to another user.',
      );
    }
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
        visibility: 'PUBLIC',
        description: null,
        lastPushedAt: null,
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
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ TypeScript: 10 }));

    await service.previewRepository('https://github.com/openai/openai-node');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.github.com/repos/openai/openai-node',
    );
    expect(getFetchHeaders(fetchMock).Authorization).toBe('Bearer test-token');
  });

  it('does not send Authorization when GITHUB_TOKEN is blank', async () => {
    process.env.GITHUB_TOKEN = '   ';
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
          description: null,
          pushed_at: null,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}));

    await service.previewRepository('https://github.com/openai/openai-node');

    expect(getFetchHeaders(fetchMock)).not.toHaveProperty('Authorization');
  });

  it('fetches repository file text from the GitHub contents API', async () => {
    const packageJson = JSON.stringify({
      dependencies: {
        react: '^19.0.0',
      },
    });
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        type: 'file',
        encoding: 'base64',
        size: Buffer.byteLength(packageJson),
        content: Buffer.from(packageJson, 'utf8').toString('base64'),
      }),
    );

    await expect(
      service.fetchRepositoryFileText(
        { owner: 'owner', repo: 'repo' },
        'package.json',
        'main',
      ),
    ).resolves.toBe(packageJson);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.github.com/repos/owner/repo/contents/package.json?ref=main',
    );
  });

  it('lists file paths from a repository directory', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse([
        { path: 'package.json', type: 'file' },
        { path: 'Dockerfile', type: 'file' },
        { path: 'prisma', type: 'dir' },
      ]),
    );

    await expect(
      service.fetchRepositoryDirectoryFilePaths(
        { owner: 'owner', repo: 'repo' },
        '.github/workflows',
        'feature/test',
      ),
    ).resolves.toEqual(['package.json', 'Dockerfile']);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://api.github.com/repos/owner/repo/contents/.github/workflows?ref=feature%2Ftest',
    );
  });

  it('returns an empty root file list for repositories without contents', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Not Found' }, 404),
    );

    await expect(
      service.fetchRepositoryDirectoryFilePaths(
        { owner: 'owner', repo: 'repo' },
        '',
        'main',
      ),
    ).resolves.toEqual([]);
  });

  it('returns null for missing repository files', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ message: 'Not Found' }, 404),
    );

    await expect(
      service.fetchRepositoryFileText(
        { owner: 'owner', repo: 'repo' },
        'package.json',
        'main',
      ),
    ).resolves.toBeNull();
  });

  it('logs repository file timeouts with request context', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    fetchMock.mockRejectedValueOnce(
      new DOMException('Request timed out', 'TimeoutError'),
    );

    await expect(
      service.fetchRepositoryFileText(
        { owner: 'owner', repo: 'repo' },
        'package.json',
        'main',
      ),
    ).rejects.toThrow(GithubRequestTimeoutException);
    expect(warn).toHaveBeenCalledWith(
      'GitHub file request timed out for owner/repo/package.json',
    );
  });

  it('logs repository metadata timeouts', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    fetchMock
      .mockRejectedValueOnce(
        new DOMException('Request timed out', 'TimeoutError'),
      )
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(
      service.previewRepository('https://github.com/owner/repo'),
    ).rejects.toThrow(GithubRequestTimeoutException);
    expect(warn).toHaveBeenCalledWith(
      'GitHub API request timed out: /repos/owner/repo',
    );
  });

  it('rejects oversized repository file responses', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        type: 'file',
        encoding: 'base64',
        size: 200_001,
        content: '',
      }),
    );

    await expect(
      service.fetchRepositoryFileText(
        { owner: 'owner', repo: 'repo' },
        'package.json',
        'main',
      ),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps GitHub 404 responses to the safe inaccessible repository message', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'Not Found' }, 404))
      .mockResolvedValueOnce(jsonResponse({}));

    const preview = service.previewRepository('https://github.com/owner/repo');

    await expect(preview).rejects.toThrow(NotFoundException);
    await expect(preview).rejects.toThrow(
      'Repository not found, private, or inaccessible.',
    );
  });

  it('uses safe 404 wording for explicitly private repository metadata', async () => {
    fetchMock
      .mockResolvedValueOnce(
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
      )
      .mockResolvedValueOnce(jsonResponse({}));

    const preview = service.previewRepository(
      'https://github.com/owner/private-repo',
    );

    await expect(preview).rejects.toThrow(NotFoundException);
    await expect(preview).rejects.toThrow(
      'Repository not found, private, or inaccessible.',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('maps GitHub rate limits to service unavailable', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ message: 'API rate limit exceeded' }, 403, {
          'x-ratelimit-remaining': '0',
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(
      service.previewRepository('https://github.com/owner/repo'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps GitHub 403 responses without rate-limit headers to service unavailable', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ message: 'Forbidden' }, 403))
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(
      service.previewRepository('https://github.com/owner/repo'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps network failures to service unavailable', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('network failed'))
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(
      service.previewRepository('https://github.com/owner/repo'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps invalid repository metadata responses to service unavailable', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ id: 123 }))
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(
      service.previewRepository('https://github.com/owner/repo'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps invalid languages responses to service unavailable', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 123,
          full_name: 'owner/repo',
          owner: { login: 'owner' },
          name: 'repo',
          html_url: 'https://github.com/owner/repo',
          default_branch: 'main',
          private: false,
          visibility: 'public',
          description: null,
          pushed_at: null,
        }),
      )
      .mockResolvedValueOnce(jsonResponse(['TypeScript']));

    await expect(
      service.previewRepository('https://github.com/owner/repo'),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('returns an empty language list when GitHub returns no languages', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          id: 123,
          full_name: 'owner/repo',
          owner: { login: 'owner' },
          name: 'repo',
          html_url: 'https://github.com/owner/repo',
          default_branch: 'main',
          private: false,
          visibility: 'public',
          description: null,
          pushed_at: null,
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}));

    await expect(
      service.previewRepository('https://github.com/owner/repo'),
    ).resolves.toMatchObject({ languages: [] });
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

function mockOAuthState(db: {
  connectedAccount: { findUnique: jest.Mock };
}): void {
  db.connectedAccount.findUnique.mockResolvedValue({
    oauthState: 'state',
    oauthStateExpiresAt: new Date(Date.now() + 60_000),
  });
}

function mockSuccessfulGithubOAuth(
  fetchMock: jest.MockedFunction<typeof fetch>,
): void {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ access_token: 'oauth-access-token' }))
    .mockResolvedValueOnce(jsonResponse({ id: 123, login: 'octocat' }));
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
