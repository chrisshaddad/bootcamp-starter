import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
  ForbiddenException,
  UnprocessableEntityException,
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
  VerifiedGithubCollaborator,
  VerifiedGithubRepository,
} from './github.types';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomUUID,
} from 'crypto';

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
const TOKEN_ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const TOKEN_ENCRYPTION_VERSION = 'v1';
const TOKEN_ENCRYPTION_KEY_BYTES = 32;

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
  fork: boolean;
  owner: {
    id: number;
    login: string;
    type: string;
  };
}

interface GithubUserResponse {
  id: number;
  login: string;
  type: string;
  avatar_url: string | null;
}

interface GithubPermissionResponse {
  permission: string;
  role_name?: string | null;
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

    // This public-only flow needs collaborator metadata, but never private
    // repository access or organization membership, so use the narrower scope.
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=public_repo&state=${state}`;
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
      this.logger.warn('GitHub OAuth did not return an access token.');
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
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
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

    const encryptedAccessToken = this.encryptGithubAccessToken(accessToken);

    // 3. Save to database
    try {
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
            githubAccessToken: encryptedAccessToken,
            oauthState: null,
            oauthStateExpiresAt: null,
          },
        }),
        this.db.projectMember.updateMany({
          where: { githubUserId: BigInt(githubUser.id) },
          data: { githubUsername: githubUser.login },
        }),
        this.db.projectInvitation.updateMany({
          where: { inviteeGithubUserId: BigInt(githubUser.id) },
          data: { inviteeGithubUsername: githubUser.login },
        }),
      ]);
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException(
          'This GitHub account is already connected to another user.',
        );
      }
      throw error;
    }
  }

  async getUserRepositories(userId: string): Promise<GithubRepository[]> {
    const githubContext = await this.getGithubContext(userId);
    const accumulatedRepos: GithubRepoResponse[] = [];
    let nextUrl: string | null =
      'https://api.github.com/user/repos?sort=updated&per_page=100';

    while (nextUrl) {
      let response: Response;
      try {
        response = await fetch(nextUrl, {
          headers: {
            Authorization: `Bearer ${githubContext.accessToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': GITHUB_USER_AGENT,
            'X-GitHub-Api-Version': GITHUB_API_VERSION,
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
        await this.handleAuthenticatedGithubErrorResponse(response);
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

    const supportedOwnedRepositories = accumulatedRepos.filter(
      (repo) =>
        !repo.private &&
        repo.owner.type === 'User' &&
        BigInt(repo.owner.id) === githubContext.githubUserId &&
        !repo.fork,
    );
    const importedRepositories = supportedOwnedRepositories.length
      ? await this.db.repository.findMany({
          where: {
            githubRepoId: {
              in: supportedOwnedRepositories.map((repo) => BigInt(repo.id)),
            },
            project: { isNot: null },
          },
          select: { githubRepoId: true },
        })
      : [];
    const importedRepositoryIds = new Set(
      importedRepositories.map((repository) =>
        repository.githubRepoId.toString(),
      ),
    );

    const validated = supportedOwnedRepositories.map((repo) => {
      const isImported = importedRepositoryIds.has(repo.id.toString());
      const eligibilityReason = isImported
        ? ('ALREADY_IMPORTED' as const)
        : null;

      return {
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        isPrivate: repo.private,
        isImported,
        isEligible: eligibilityReason === null,
        eligibilityReason,
        url: repo.html_url,
        updatedAt: repo.updated_at,
        description: repo.description,
        language: repo.language,
      };
    });

    return githubRepositoryListSchema.parse(
      validated.sort(
        (left, right) => Number(left.isImported) - Number(right.isImported),
      ),
    );
  }

  async verifyRepositoryOwnership(
    userId: string,
    repositoryUrl: string,
  ): Promise<VerifiedGithubRepository> {
    const repository = parseGithubRepositoryUrl(repositoryUrl);
    const context = await this.getGithubContext(userId);
    const apiRepository = await this.fetchGithubJsonWithToken<unknown>(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
        repository.repo,
      )}`,
      context.accessToken,
    );

    if (!isRecord(apiRepository) || !isRecord(apiRepository.owner)) {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    const ownerType = getRequiredString(apiRepository.owner.type);
    const ownerGithubUserId = parseGithubId(apiRepository.owner.id);
    const isPrivate = apiRepository.private === true;
    const isFork = apiRepository.fork === true;

    if (isPrivate) {
      throw new UnprocessableEntityException(
        'Only public GitHub repositories can be published.',
      );
    }

    if (ownerType !== 'User') {
      throw new UnprocessableEntityException(
        'Organization-owned repositories are not supported yet.',
      );
    }

    if (isFork) {
      throw new UnprocessableEntityException(
        'Forked repositories cannot be published as original projects.',
      );
    }

    if (ownerGithubUserId !== context.githubUserId) {
      throw new ForbiddenException(
        'Only the verified GitHub repository owner can publish this project.',
      );
    }

    return {
      ...this.normalizeRepository(apiRepository),
      ownerGithubUserId,
      ownerType: 'User',
      isFork: false,
    };
  }

  async verifyRepositoryCollaborator(
    repositoryOwnerUserId: string,
    repositoryFullName: string,
    githubUsername: string,
  ): Promise<VerifiedGithubCollaborator> {
    const context = await this.getGithubContext(repositoryOwnerUserId);
    const repository = parseGithubRepositoryUrl(
      `https://github.com/${repositoryFullName}`,
    );
    const normalizedUsername = githubUsername.trim();
    const githubUser = await this.fetchGithubJsonWithToken<GithubUserResponse>(
      `/users/${encodeURIComponent(normalizedUsername)}`,
      context.accessToken,
      'GitHub user not found.',
    );

    if (
      !githubUser ||
      typeof githubUser.id !== 'number' ||
      typeof githubUser.login !== 'string' ||
      githubUser.type !== 'User'
    ) {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    const permission =
      await this.fetchGithubJsonWithToken<GithubPermissionResponse>(
        `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
          repository.repo,
        )}/collaborators/${encodeURIComponent(githubUser.login)}/permission`,
        context.accessToken,
        'This GitHub user is not a repository collaborator.',
      );

    if (!permission || typeof permission.permission !== 'string') {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    if (permission.permission === 'none') {
      throw new NotFoundException(
        'This GitHub user is not a repository collaborator.',
      );
    }

    return {
      githubUserId: BigInt(githubUser.id),
      githubUsername: githubUser.login,
      avatarUrl:
        typeof githubUser.avatar_url === 'string'
          ? githubUser.avatar_url
          : null,
      permission: permission.permission,
      roleName:
        typeof permission.role_name === 'string' ? permission.role_name : null,
    };
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
      await this.handleGithubErrorResponse(response);
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
      await this.handleGithubErrorResponse(response);
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

  private async getGithubContext(userId: string): Promise<{
    githubUserId: bigint;
    githubUsername: string;
    accessToken: string;
  }> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: {
        developerProfile: {
          select: { githubUserId: true, githubUsername: true },
        },
        connectedAccount: {
          select: { githubAccessToken: true },
        },
      },
    });

    const githubUserId = user?.developerProfile?.githubUserId;
    const githubUsername = user?.developerProfile?.githubUsername;
    const encryptedAccessToken = user?.connectedAccount?.githubAccessToken;

    if (!githubUserId || !githubUsername || !encryptedAccessToken) {
      throw new BadRequestException(
        'Connect your GitHub account before continuing.',
      );
    }

    return {
      githubUserId,
      githubUsername,
      accessToken: this.decryptGithubAccessToken(encryptedAccessToken),
    };
  }

  private async fetchGithubJsonWithToken<T>(
    path: string,
    accessToken: string,
    notFoundMessage = REPOSITORY_NOT_FOUND_MESSAGE,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': GITHUB_USER_AGENT,
          'X-GitHub-Api-Version': GITHUB_API_VERSION,
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
      await this.handleAuthenticatedGithubErrorResponse(
        response,
        notFoundMessage,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }
  }

  private async handleGithubErrorResponse(response: Response): Promise<never> {
    if (response.status === 404) {
      throw new NotFoundException(REPOSITORY_NOT_FOUND_MESSAGE);
    }

    if (await this.isRateLimited(response)) {
      throw new ServiceUnavailableException(GITHUB_RATE_LIMIT_MESSAGE);
    }

    this.logger.warn(
      `GitHub API request failed with status ${response.status}`,
    );
    throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
  }

  private async handleAuthenticatedGithubErrorResponse(
    response: Response,
    notFoundMessage = REPOSITORY_NOT_FOUND_MESSAGE,
  ): Promise<never> {
    if (response.status === 404) {
      throw new NotFoundException(notFoundMessage);
    }

    if (response.status === 401) {
      throw new BadRequestException(
        'Your GitHub connection has expired. Reconnect GitHub and try again.',
      );
    }

    if (await this.isRateLimited(response)) {
      throw new ServiceUnavailableException(GITHUB_RATE_LIMIT_MESSAGE);
    }

    if (response.status === 403) {
      throw new ForbiddenException(
        'GitHub did not authorize this repository operation. Reconnect GitHub and try again.',
      );
    }

    this.logger.warn(
      `Authenticated GitHub API request failed with status ${response.status}`,
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

  private encryptGithubAccessToken(accessToken: string): string {
    const key = this.getTokenEncryptionKey();
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv(
      TOKEN_ENCRYPTION_ALGORITHM,
      key,
      initializationVector,
    );
    const ciphertext = Buffer.concat([
      cipher.update(accessToken, 'utf8'),
      cipher.final(),
    ]);

    return [
      TOKEN_ENCRYPTION_VERSION,
      initializationVector.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      ciphertext.toString('base64url'),
    ].join(':');
  }

  private decryptGithubAccessToken(encryptedAccessToken: string): string {
    const [version, initializationVector, authTag, ciphertext, ...extraParts] =
      encryptedAccessToken.split(':');

    if (
      version !== TOKEN_ENCRYPTION_VERSION ||
      !initializationVector ||
      !authTag ||
      !ciphertext ||
      extraParts.length > 0
    ) {
      throw new BadRequestException(
        'Your GitHub connection needs to be reconnected.',
      );
    }

    try {
      const decipher = createDecipheriv(
        TOKEN_ENCRYPTION_ALGORITHM,
        this.getTokenEncryptionKey(),
        Buffer.from(initializationVector, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(authTag, 'base64url'));

      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      this.logger.warn('Failed to decrypt a GitHub access token.');
      throw new BadRequestException(
        'Your GitHub connection needs to be reconnected.',
      );
    }
  }

  private getTokenEncryptionKey(): Buffer {
    const configuredKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
    if (!configuredKey) {
      throw new ServiceUnavailableException(
        'GitHub token encryption is not configured on the server.',
      );
    }

    const key = Buffer.from(configuredKey, 'base64');
    if (key.byteLength !== TOKEN_ENCRYPTION_KEY_BYTES) {
      throw new ServiceUnavailableException(
        'GitHub token encryption is not configured on the server.',
      );
    }

    return key;
  }

  private async isRateLimited(response: Response): Promise<boolean> {
    if (
      response.status === 429 ||
      response.headers.has('retry-after') ||
      response.headers.get('x-ratelimit-remaining') === '0'
    ) {
      return true;
    }

    if (response.status !== 403) return false;

    try {
      const body = await response.clone().text();
      return /secondary rate limit|abuse detection/i.test(body);
    } catch {
      return false;
    }
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

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return isRecord(error) && error.code === 'P2002';
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

function parseGithubId(value: unknown): bigint {
  const normalized = getRequiredStringOrNumber(value);
  try {
    const id = BigInt(normalized);
    if (id <= 0n) {
      throw new Error('Invalid GitHub ID');
    }
    return id;
  } catch {
    throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
  }
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
