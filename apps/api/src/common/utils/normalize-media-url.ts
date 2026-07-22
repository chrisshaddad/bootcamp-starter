export function normalizeMediaUrl(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  let candidate = normalized;
  if (candidate.startsWith('/')) {
    const apiUrl = (process.env.API_URL ?? 'http://localhost:3001').replace(
      /\/+$/,
      '',
    );
    candidate = `${apiUrl}${candidate}`;
  }

  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
