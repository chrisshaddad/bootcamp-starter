import {
  DeleteObjectsCommand,
  PutObjectCommand,
  type ObjectIdentifier,
  type S3Client,
} from '@aws-sdk/client-s3';
import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_OBJECT_STORAGE_BUCKET,
  DEFAULT_OBJECT_STORAGE_ENDPOINT,
  OBJECT_STORAGE_CLIENT,
} from './storage.constants';

export interface StoredObject {
  key: string;
  publicUrl: string;
}

@Injectable()
export class ObjectStorageService {
  private readonly logger = new Logger(ObjectStorageService.name);
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(
    @Inject(OBJECT_STORAGE_CLIENT) private readonly client: S3Client,
    config: ConfigService,
  ) {
    const isProduction = config.get<string>('NODE_ENV') === 'production';
    const configuredPublicUrl = config.get<string>('OBJECT_STORAGE_PUBLIC_URL');
    const endpoint = config.get<string>('OBJECT_STORAGE_ENDPOINT');
    if (isProduction && !configuredPublicUrl && !endpoint) {
      throw new Error(
        'OBJECT_STORAGE_PUBLIC_URL or OBJECT_STORAGE_ENDPOINT is required in production to generate public object URLs',
      );
    }

    this.bucket =
      config.get<string>('OBJECT_STORAGE_BUCKET') ??
      DEFAULT_OBJECT_STORAGE_BUCKET;
    this.publicBaseUrl = configuredPublicUrl
      ? configuredPublicUrl.replace(/\/+$/, '')
      : `${(endpoint ?? DEFAULT_OBJECT_STORAGE_ENDPOINT).replace(/\/+$/, '')}/${encodeURIComponent(this.bucket)}`;
  }

  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<StoredObject> {
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
      this.logger.error(
        `Failed to upload object ${key}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Object storage is temporarily unavailable',
      );
    }

    return { key, publicUrl: this.publicUrl(key) };
  }

  async delete(key: string): Promise<void> {
    await this.deleteMany([key]);
  }

  async deleteMany(keys: string[]): Promise<void> {
    const uniqueKeys = [...new Set(keys.filter(Boolean))];
    if (uniqueKeys.length === 0) return;

    try {
      for (let offset = 0; offset < uniqueKeys.length; offset += 1000) {
        const objects: ObjectIdentifier[] = uniqueKeys
          .slice(offset, offset + 1000)
          .map((Key) => ({ Key }));
        const response = await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects, Quiet: true },
          }),
        );

        if (response.Errors?.length) {
          throw new Error(
            response.Errors.map(
              (item) => `${item.Key ?? 'unknown'}: ${item.Message ?? 'failed'}`,
            ).join(', '),
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete ${uniqueKeys.length} object(s)`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Object storage is temporarily unavailable',
      );
    }
  }

  keyFromPublicUrl(value: string | null | undefined): string | null {
    if (!value) return null;

    try {
      const candidate = new URL(value);
      const base = new URL(this.publicBaseUrl);
      if (candidate.origin !== base.origin) return null;

      const basePath = base.pathname.replace(/\/+$/, '');
      const objectPrefix = `${basePath}/`;
      if (!candidate.pathname.startsWith(objectPrefix)) return null;

      const encodedKey = candidate.pathname.slice(objectPrefix.length);
      if (!encodedKey) return null;
      return encodedKey
        .split('/')
        .map((segment) => decodeURIComponent(segment))
        .join('/');
    } catch {
      return null;
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
