import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import {
  type GithubRepositoryPreviewResponse,
  githubRepositoryListSchema,
  type GithubRepository,
} from '@repo/contracts';
import { DatabaseService } from '../database/prisma.service';
import { parseGithubRepositoryUrl } from './github-url.parser';
import type {
  NormalizedGithubLanguage,
  NormalizedGithubRepository,
  ParsedGithubRepository,
} from './github.types';
import { randomUUID } from 'crypto';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_USER_AGENT = 'bootcamp-starter-api';
const REPOSITORY_NOT_FOUND_MESSAGE =
  'Repository not found, private, or inaccessible.';
const GITHUB_API_UNAVAILABLE_MESSAGE =
  'GitHub API is currently unavailable. Please try again later.';
const GITHUB_RATE_LIMIT_MESSAGE =
  'GitHub API rate limit exceeded. Please try again later.';
const MAX_REPOSITORY_FILE_BYTES = 200_000;

export class GithubRequestTimeoutException extends ServiceUnavailableException {
  constructor() {
    super(GITHUB_API_UNAVAILABLE_MESSAGE);
  }
}

interface GithubRepoResponse {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  updated_at: string;
  description: string | null;
  language: string | null;
}

function getNextPageUrl(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const links = linkHeader.split(',');
  for (const link of links) {
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    if (match) {
      return match[1] ?? null;
    }
  }
  return null;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  constructor(private readonly db: DatabaseService) {}

  // ==========================================
  // OAUTH & REPOSITORY FETCHING
  // ==========================================

  async getOAuthConnectUrl(userId: string): Promise<string> {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      throw new ServiceUnavailableException(
        'GitHub OAuth is not configured on the server',
      );
    }
    const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
    const redirectUri = encodeURIComponent(`${apiUrl}/github/callback`);

    const state = randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.db.connectedAccount.upsert({
      where: { userId },
      create: {
        userId,
        oauthState: state,
        oauthStateExpiresAt: expiresAt,
      },
      update: {
        oauthState: state,
        oauthStateExpiresAt: expiresAt,
      },
    });

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=repo&state=${state}`;
  }

  async handleOAuthCallback(
    userId: string,
    code: string,
    state: string,
  ): Promise<void> {
    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      throw new ServiceUnavailableException('GitHub OAuth is not configured');
    }

    if (!state) {
      throw new BadRequestException('State parameter is missing');
    }

    const connectedAccount = await this.db.connectedAccount.findUnique({
      where: { userId },
    });

    if (
      !connectedAccount ||
      connectedAccount.oauthState !== state ||
      !connectedAccount.oauthStateExpiresAt ||
      connectedAccount.oauthStateExpiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired state parameter');
    }

    // 1. Exchange code for access token
    let tokenResponse: Response;
    try {
      tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new GithubRequestTimeoutException();
      }
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    if (!tokenResponse.ok) {
      throw new BadRequestException('Failed to obtain GitHub access token');
    }

    let tokenData: { access_token?: string };
    try {
      tokenData = (await tokenResponse.json()) as { access_token?: string };
    } catch {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      this.logger.error('Failed to obtain GitHub access token:', tokenData);
      throw new BadRequestException('Failed to obtain GitHub access token');
    }

    // 2. Fetch the user's GitHub profile
    let userResponse: Response;
    try {
      userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': GITHUB_USER_AGENT,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new GithubRequestTimeoutException();
      }
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    if (!userResponse.ok) {
      throw new BadRequestException('Failed to fetch GitHub profile');
    }

    let githubUser: { id: number; login: string };
    try {
      githubUser = (await userResponse.json()) as { id: number; login: string };
    } catch {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    // 3. Save to database
    await this.db.$transaction([
      this.db.developerProfile.update({
        where: { userId },
        data: {
          githubUserId: BigInt(githubUser.id),
          githubUsername: githubUser.login,
          githubConnectedAt: new Date(),
        },
      }),
      this.db.connectedAccount.update({
        where: { userId },
        data: {
          githubAccessToken: accessToken ?? null,
          oauthState: null,
          oauthStateExpiresAt: null,
        },
      }),
    ]);
  }

  async connectUsingEnvToken(userId: string): Promise<void> {
    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token) {
      throw new BadRequestException(
        'GITHUB_TOKEN is not configured in your backend .env file.',
      );
    }

    let response: Response;
    try {
      response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': GITHUB_USER_AGENT,
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        throw new GithubRequestTimeoutException();
      }
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    if (!response.ok) {
      throw new BadRequestException(
        'Failed to validate the GITHUB_TOKEN. Make sure it has "repo" permissions.',
      );
    }

    let githubUser: { id: number; login: string };
    try {
      githubUser = (await response.json()) as { id: number; login: string };
    } catch {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    await this.db.$transaction([
      this.db.developerProfile.update({
        where: { userId },
        data: {
          githubUserId: BigInt(githubUser.id),
          githubUsername: githubUser.login,
          githubConnectedAt: new Date(),
        },
      }),
      this.db.connectedAccount.upsert({
        where: { userId },
        create: {
          userId,
          githubAccessToken: token ?? null,
        },
        update: {
          githubAccessToken: token ?? null,
        },
      }),
    ]);
  }

  async getUserRepositories(userId: string): Promise<GithubRepository[]> {
    const profile = await this.db.connectedAccount.findUnique({
      where: { userId },
      select: { githubAccessToken: true },
    });

    if (!profile || !profile.githubAccessToken) {
      throw new BadRequestException('GitHub account not connected');
    }

    const accumulatedRepos: GithubRepoResponse[] = [];
    let nextUrl: string | null =
      'https://api.github.com/user/repos?sort=updated&per_page=100';

    while (nextUrl) {
      let response: Response;
      try {
        response = await fetch(nextUrl, {
          headers: {
            Authorization: `Bearer ${profile.githubAccessToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': GITHUB_USER_AGENT,
          },
          signal: AbortSignal.timeout(10_000),
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'TimeoutError') {
          throw new GithubRequestTimeoutException();
        }
        throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
      }

      if (!response.ok) {
        throw new ServiceUnavailableException(
          'Failed to fetch repositories from GitHub',
        );
      }

      let repos: GithubRepoResponse[];
      try {
        repos = (await response.json()) as GithubRepoResponse[];
      } catch {
        throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
      }

      accumulatedRepos.push(...repos);

      const linkHeader = response.headers.get('link');
      nextUrl = getNextPageUrl(linkHeader);
    }

    const validated = accumulatedRepos.map((repo) => ({
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: repo.private,
      url: repo.html_url,
      updatedAt: repo.updated_at,
      description: repo.description,
      language: repo.language,
    }));

    return githubRepositoryListSchema.parse(validated);
  }

  // ==========================================
  // PREVIEW AND ANALYSIS
  // ==========================================

  async previewRepository(
    repositoryUrl: string,
  ): Promise<GithubRepositoryPreviewResponse> {
    const repository = parseGithubRepositoryUrl(repositoryUrl);
    return this.fetchRepositoryPreview(repository);
  }

  async fetchRepositoryPreview(
    repository: ParsedGithubRepository,
  ): Promise<GithubRepositoryPreviewResponse> {
    const [apiRepository, apiLanguages] = await Promise.all([
      this.fetchGithubJson<unknown>(
        `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
          repository.repo,
        )}`,
      ),
      this.fetchGithubJson<unknown>(
        `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
          repository.repo,
        )}/languages`,
      ),
    ]);

    const normalizedRepository = this.normalizeRepository(apiRepository);
    const languages = this.normalizeLanguages(apiLanguages);

    return {
      repository: normalizedRepository,
      languages,
    };
  }

  async fetchRepositoryLanguages(
    repository: ParsedGithubRepository,
  ): Promise<NormalizedGithubLanguage[]> {
    const apiLanguages = await this.fetchGithubJson<unknown>(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
        repository.repo,
      )}/languages`,
    );

    return this.normalizeLanguages(apiLanguages);
  }

  async fetchRepositoryDirectoryFilePaths(
    repository: ParsedGithubRepository,
    directoryPath: string,
    ref?: string | null,
  ): Promise<string[]> {
    const encodedDirectoryPath = directoryPath
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/');
    const pathSuffix = encodedDirectoryPath ? `/${encodedDirectoryPath}` : '';
    const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : '';
    const apiEntries = await this.fetchGithubJson<unknown>(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
        repository.repo,
      )}/contents${pathSuffix}${refQuery}`,
      [],
    );

    return this.normalizeDirectoryFilePaths(apiEntries);
  }

  async fetchRepositoryFileText(
    repository: ParsedGithubRepository,
    path: string,
    ref?: string | null,
  ): Promise<string | null> {
    const encodedPath = path.split('/').map(encodeURIComponent).join('/');
    const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : '';

    let response: Response;

    try {
      response = await fetch(
        `${GITHUB_API_BASE_URL}/repos/${encodeURIComponent(
          repository.owner,
        )}/${encodeURIComponent(repository.repo)}/contents/${encodedPath}${refQuery}`,
        {
          headers: this.buildHeaders(),
          signal: AbortSignal.timeout(10_000),
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        this.logger.warn(
          `GitHub file request timed out for ${repository.owner}/${repository.repo}/${path}`,
        );
        throw new GithubRequestTimeoutException();
      }
      this.logger.warn(
        `GitHub file request failed before response: ${getErrorMessage(error)}`,
      );
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      this.handleGithubErrorResponse(response);
    }

    let apiFile: unknown;

    try {
      apiFile = await response.json();
    } catch (error) {
      this.logger.warn(
        `GitHub file API returned invalid JSON: ${getErrorMessage(error)}`,
      );
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    return this.normalizeFileText(apiFile);
  }

  private async fetchGithubJson<T>(
    path: string,
    notFoundValue?: T,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
        headers: this.buildHeaders(),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TimeoutError') {
        this.logger.warn(`GitHub API request timed out: ${path}`);
        throw new GithubRequestTimeoutException();
      }
      this.logger.warn(
        `GitHub API request failed before response: ${getErrorMessage(error)}`,
      );
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    if (response.status === 404 && notFoundValue !== undefined) {
      return notFoundValue;
    }

    if (!response.ok) {
      this.handleGithubErrorResponse(response);
    }

    try {
      return (await response.json()) as T;
    } catch (error) {
      this.logger.warn(
        `GitHub API returned invalid JSON: ${getErrorMessage(error)}`,
      );
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }
  }

  private handleGithubErrorResponse(response: Response): never {
    if (response.status === 404) {
      throw new NotFoundException(REPOSITORY_NOT_FOUND_MESSAGE);
    }

    if (response.status === 403 && this.isRateLimited(response)) {
      throw new ServiceUnavailableException(GITHUB_RATE_LIMIT_MESSAGE);
    }

    this.logger.warn(
      `GitHub API request failed with status ${response.status}`,
    );
    throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': GITHUB_USER_AGENT,
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    };

    const githubToken = process.env.GITHUB_TOKEN?.trim();
    if (githubToken) {
      headers.Authorization = `Bearer ${githubToken}`;
    }

    return headers;
  }

  private isRateLimited(response: Response): boolean {
    return response.headers.get('x-ratelimit-remaining') === '0';
  }

  private normalizeLanguages(
    apiLanguages: unknown,
  ): NormalizedGithubLanguage[] {
    if (!isRecord(apiLanguages)) {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    return Object.entries(apiLanguages)
      .filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number',
      )
      .map(([name, bytes]) => ({ name, bytes }));
  }

  private normalizeDirectoryFilePaths(apiEntries: unknown): string[] {
    if (!Array.isArray(apiEntries)) {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    return apiEntries.flatMap((entry) => {
      if (!isRecord(entry)) {
        throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
      }

      const path = getOptionalString(entry.path);
      const type = getOptionalString(entry.type);
      if (!path || !type) {
        throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
      }

      return type === 'file' ? [path] : [];
    });
  }

  private normalizeFileText(apiFile: unknown): string {
    if (!isRecord(apiFile)) {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    const fileSize = getOptionalNumber(apiFile.size);
    if (fileSize !== undefined && fileSize > MAX_REPOSITORY_FILE_BYTES) {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    if (apiFile.type !== 'file' || apiFile.encoding !== 'base64') {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    const content = getRequiredFileContent(apiFile.content);
    const decoded = Buffer.from(content.replace(/\s/g, ''), 'base64');

    if (decoded.byteLength > MAX_REPOSITORY_FILE_BYTES) {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    return decoded.toString('utf8');
  }

  private normalizeRepository(
    apiRepository: unknown,
  ): NormalizedGithubRepository {
    if (!isRecord(apiRepository)) {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    const owner = apiRepository.owner;
    if (!isRecord(owner)) {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    const visibility = getOptionalString(apiRepository.visibility);
    const isPrivate =
      apiRepository.private === true || visibility?.toLowerCase() === 'private';

    if (isPrivate || (visibility && visibility.toLowerCase() !== 'public')) {
      throw new NotFoundException(REPOSITORY_NOT_FOUND_MESSAGE);
    }

    return {
      githubRepoId: getRequiredStringOrNumber(apiRepository.id),
      fullName: getRequiredString(apiRepository.full_name),
      ownerLogin: getRequiredString(owner.login),
      repoName: getRequiredString(apiRepository.name),
      htmlUrl: getRequiredString(apiRepository.html_url),
      defaultBranch: getNullableString(apiRepository.default_branch),
      visibility: 'PUBLIC',
      description: getNullableString(apiRepository.description),
      lastPushedAt: getNullableString(apiRepository.pushed_at),
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRequiredString(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
  }

  return value;
}

function getRequiredFileContent(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
  }

  return value;
}

function getRequiredStringOrNumber(value: unknown): string {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    String(value).length === 0
  ) {
    throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
  }

  return String(value);
}

function getOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function getOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function getNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
