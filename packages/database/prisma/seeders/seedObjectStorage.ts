import {
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const DEFAULT_BUCKET = 'bootcamp-media';
const DEFAULT_ENDPOINT = 'http://localhost:9000';
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_ACCESS_KEY = 'bootcamp';
const DEFAULT_SECRET_KEY = 'bootcamp-secret';
const MAX_SEED_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

export class SeedObjectStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor() {
    const endpoint = process.env.OBJECT_STORAGE_ENDPOINT ?? DEFAULT_ENDPOINT;
    this.bucket = process.env.OBJECT_STORAGE_BUCKET ?? DEFAULT_BUCKET;
    this.publicBaseUrl = (
      process.env.OBJECT_STORAGE_PUBLIC_URL ??
      `${endpoint.replace(/\/+$/, '')}/${encodeURIComponent(this.bucket)}`
    ).replace(/\/+$/, '');

    this.client = new S3Client({
      endpoint,
      region: process.env.OBJECT_STORAGE_REGION ?? DEFAULT_REGION,
      forcePathStyle:
        process.env.OBJECT_STORAGE_FORCE_PATH_STYLE?.toLowerCase() !== 'false',
      credentials: {
        accessKeyId:
          process.env.OBJECT_STORAGE_ACCESS_KEY ?? DEFAULT_ACCESS_KEY,
        secretAccessKey:
          process.env.OBJECT_STORAGE_SECRET_KEY ?? DEFAULT_SECRET_KEY,
      },
    });
  }

  async assertAvailable(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      throw new Error(
        `Seed object-storage bucket "${this.bucket}" is unavailable: ${errorMessage(error)}`,
      );
    }
  }

  async mirrorImage(sourceUrl: string, key: string): Promise<string> {
    if (await this.objectExists(key)) {
      return this.publicUrl(key);
    }

    let response: Response;
    try {
      response = await fetch(sourceUrl, {
        headers: { 'user-agent': 'bootcamp-starter-seeder/1.0' },
        signal: AbortSignal.timeout(60_000),
      });
    } catch (error) {
      throw new Error(
        `Failed to download seed image ${sourceUrl}: ${errorMessage(error)}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `Failed to download seed image ${sourceUrl}: HTTP ${response.status}`,
      );
    }

    const contentType = response.headers
      .get('content-type')
      ?.split(';')[0]
      ?.trim();
    if (!contentType?.startsWith('image/')) {
      throw new Error(
        `Seed image ${sourceUrl} returned unsupported content type "${contentType ?? 'unknown'}".`,
      );
    }

    const declaredSize = Number(response.headers.get('content-length'));
    if (
      Number.isFinite(declaredSize) &&
      declaredSize > MAX_SEED_IMAGE_SIZE_BYTES
    ) {
      throw new Error(`Seed image ${sourceUrl} exceeds the 10 MB limit.`);
    }

    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > MAX_SEED_IMAGE_SIZE_BYTES) {
      throw new Error(`Seed image ${sourceUrl} exceeds the 10 MB limit.`);
    }

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentLength: body.length,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
    } catch (error) {
      throw new Error(
        `Failed to upload seed image to ${key}: ${errorMessage(error)}`,
      );
    }

    console.log(`  Uploaded seed image ${key}.`);
    return this.publicUrl(key);
  }

  private async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (error) {
      if (isNotFound(error)) return false;
      throw new Error(
        `Failed to inspect seed object ${key}: ${errorMessage(error)}`,
      );
    }
  }

  private publicUrl(key: string): string {
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${this.publicBaseUrl}/${encodedKey}`;
  }
}

function isNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as {
    name?: string;
    $metadata?: { httpStatusCode?: number };
  };
  return (
    candidate.$metadata?.httpStatusCode === 404 ||
    candidate.name === 'NotFound' ||
    candidate.name === 'NoSuchKey'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
