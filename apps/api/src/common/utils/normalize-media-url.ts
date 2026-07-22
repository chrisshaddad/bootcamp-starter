export function normalizeMediaUrl(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  if (normalized.startsWith('/')) {
    const apiUrl = (process.env.API_URL ?? 'http://localhost:3001').replace(
      /\/+$/,
      '',
    );
    return `${apiUrl}${normalized}`;
  }

  try {
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}
