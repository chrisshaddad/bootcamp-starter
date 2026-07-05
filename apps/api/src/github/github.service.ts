import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { GithubRepositoryPreviewResponse } from '@repo/contracts';
import { parseGithubRepositoryUrl } from './github-url.parser';
import type {
  NormalizedGithubLanguage,
  NormalizedGithubRepository,
  ParsedGithubRepository,
} from './github.types';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_USER_AGENT = 'bootcamp-starter-api';
const REPOSITORY_NOT_FOUND_MESSAGE =
  'Repository not found, private, or inaccessible.';
const GITHUB_API_UNAVAILABLE_MESSAGE =
  'GitHub API is currently unavailable. Please try again later.';
const GITHUB_RATE_LIMIT_MESSAGE =
  'GitHub API rate limit exceeded. Please try again later.';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  /**
   * Validates a browser GitHub repository URL and returns a read-only preview.
   *
   * A successful preview proves only that GitHub metadata can be scanned; it
   * does not prove ownership, contribution, or permission to publish a project.
   */
  async previewRepository(
    repositoryUrl: string,
  ): Promise<GithubRepositoryPreviewResponse> {
    const repository = parseGithubRepositoryUrl(repositoryUrl);
    return this.fetchRepositoryPreview(repository);
  }

  /**
   * Fetches normalized repository metadata and language byte counts.
   *
   * This method stays reusable for a future ProjectsService import flow while
   * keeping persistence and ownership verification outside the GitHub client.
   */
  async fetchRepositoryPreview(
    repository: ParsedGithubRepository,
  ): Promise<GithubRepositoryPreviewResponse> {
    const apiRepository = await this.fetchGithubJson<unknown>(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
        repository.repo,
      )}`,
    );
    const normalizedRepository = this.normalizeRepository(apiRepository);
    const languages = await this.fetchRepositoryLanguages(repository);

    return {
      repository: normalizedRepository,
      languages,
    };
  }

  /**
   * Fetches GitHub's language byte-count summary for a public repository.
   *
   * This uses GitHub's REST API endpoint, not a browser URL:
   * GET /repos/{owner}/{repo}/languages
   *
   * The returned byte counts are kept raw so later scanner/search logic can
   * calculate language percentages without re-fetching the repository.
   */
  async fetchRepositoryLanguages(
    repository: ParsedGithubRepository,
  ): Promise<NormalizedGithubLanguage[]> {
    const apiLanguages = await this.fetchGithubJson<unknown>(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(
        repository.repo,
      )}/languages`,
    );

    if (!isRecord(apiLanguages)) {
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
    }

    return Object.entries(apiLanguages)
      .filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number',
      )
      .map(([name, bytes]) => ({ name, bytes }));
  }

  private async fetchGithubJson<T>(path: string): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
        headers: this.buildHeaders(),
      });
    } catch (error) {
      this.logger.warn(
        `GitHub API request failed before response: ${getErrorMessage(error)}`,
      );
      throw new ServiceUnavailableException(GITHUB_API_UNAVAILABLE_MESSAGE);
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

  /**
   * Converts GitHub's raw repository payload into the API preview shape.
   *
   * Private or non-public repositories are reported with the same safe 404
   * wording used for inaccessible repositories so the API does not imply
   * whether a private repository exists.
   */
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

function getNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
