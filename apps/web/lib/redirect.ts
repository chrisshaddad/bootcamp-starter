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

  // Must be an absolute path beginning with a single forward slash. Rejects
  // absolute URLs ("https://…") and protocol-relative ("//host") targets.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback;
  }

  // Resolve against a fixed, unreachable origin and require the result to stay
  // on it. The URL parser strips ASCII tab/newline/CR the same way a browser
  // does during navigation, so control-character tricks like "/\t/evil.com"
  // (which collapses to "//evil.com") are normalized and caught here rather
  // than slipping through the prefix checks above. Only the same-origin
  // pathname + search + hash are returned.
  const base = 'https://redirect.invalid';
  try {
    const url = new URL(raw, base);
    if (url.origin !== base) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
