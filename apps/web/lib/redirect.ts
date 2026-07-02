const DEFAULT_REDIRECT = '/dashboard';

/**
 * Sanitize a user-supplied post-login redirect target.
 *
 * Only same-origin absolute paths are allowed. Anything else — an absolute URL
 * (`https://evil.com`), a protocol-relative URL (`//evil.com`), or a backslash
 * trick (`/\evil.com`, which some browsers normalize to `//`) — is rejected in
 * favor of the fallback so a crafted `?redirect=` cannot bounce the user
 * off-site.
 */
export function getSafeRedirectPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT,
): string {
  if (!raw) {
    return fallback;
  }

  // Must be an absolute path beginning with a single forward slash.
  if (!raw.startsWith('/')) {
    return fallback;
  }

  // Reject protocol-relative ("//host") and backslash-normalized ("/\host")
  // targets that resolve to a different origin.
  if (raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback;
  }

  return raw;
}
