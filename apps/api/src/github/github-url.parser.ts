import { BadRequestException } from '@nestjs/common';
import type { ParsedGithubRepository } from './github.types';

const INVALID_GITHUB_REPOSITORY_URL = 'Invalid GitHub repository URL';
const GITHUB_OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;
const GITHUB_REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;

/**
 * Parses a public GitHub repository URL into its canonical owner/repo pair.
 *
 * Accepted examples:
 * - https://github.com/vercel/next.js
 * - https://github.com/vercel/next.js.git
 *
 * This function intentionally rejects non-repository URLs instead of guessing,
 * because importing the wrong repository would create misleading project claims.
 */
export function parseGithubRepositoryUrl(
  repositoryUrl: string,
): ParsedGithubRepository {
  let url: URL;

  try {
    url = new URL(repositoryUrl.trim());
  } catch {
    throw new BadRequestException(INVALID_GITHUB_REPOSITORY_URL);
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname.toLowerCase() !== 'github.com' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new BadRequestException(INVALID_GITHUB_REPOSITORY_URL);
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length !== 2) {
    throw new BadRequestException(INVALID_GITHUB_REPOSITORY_URL);
  }

  const [encodedOwner, encodedRepo] = segments;
  const owner = decodePathSegment(encodedOwner);
  const repo = stripGitSuffix(decodePathSegment(encodedRepo));

  if (!isValidOwner(owner) || !isValidRepo(repo)) {
    throw new BadRequestException(INVALID_GITHUB_REPOSITORY_URL);
  }

  return { owner, repo };
}

function decodePathSegment(segment: string | undefined): string {
  if (!segment) {
    throw new BadRequestException(INVALID_GITHUB_REPOSITORY_URL);
  }

  try {
    return decodeURIComponent(segment);
  } catch {
    throw new BadRequestException(INVALID_GITHUB_REPOSITORY_URL);
  }
}

function stripGitSuffix(repo: string): string {
  return repo.endsWith('.git') ? repo.slice(0, -4) : repo;
}

function isValidOwner(owner: string): boolean {
  return GITHUB_OWNER_PATTERN.test(owner);
}

function isValidRepo(repo: string): boolean {
  return (
    GITHUB_REPO_PATTERN.test(repo) &&
    repo !== '.' &&
    repo !== '..' &&
    !repo.includes('/')
  );
}
