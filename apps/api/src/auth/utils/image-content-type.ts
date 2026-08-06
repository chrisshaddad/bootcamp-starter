const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export function imageContentType(extension: string): string {
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) {
    throw new Error(`Unsupported image extension: ${extension}`);
  }
  return contentType;
}
