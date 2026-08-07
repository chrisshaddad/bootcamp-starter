import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import {
  DEFAULT_OBJECT_STORAGE_ACCESS_KEY,
  DEFAULT_OBJECT_STORAGE_ENDPOINT,
  DEFAULT_OBJECT_STORAGE_REGION,
  DEFAULT_OBJECT_STORAGE_SECRET_KEY,
  OBJECT_STORAGE_CLIENT,
} from './storage.constants';
import { ObjectStorageService } from './storage.service';

function createClient(config: ConfigService): S3Client {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const endpoint = config.get<string>('OBJECT_STORAGE_ENDPOINT');
  const accessKeyId = config.get<string>('OBJECT_STORAGE_ACCESS_KEY');
  const secretAccessKey = config.get<string>('OBJECT_STORAGE_SECRET_KEY');

  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new Error(
      'OBJECT_STORAGE_ACCESS_KEY and OBJECT_STORAGE_SECRET_KEY must be configured together',
    );
  }

  const resolvedEndpoint =
    endpoint ?? (isProduction ? undefined : DEFAULT_OBJECT_STORAGE_ENDPOINT);
  const forcePathStyleValue = config.get<string>(
    'OBJECT_STORAGE_FORCE_PATH_STYLE',
  );
  const clientConfig: S3ClientConfig = {
    region:
      config.get<string>('OBJECT_STORAGE_REGION') ??
      DEFAULT_OBJECT_STORAGE_REGION,
    forcePathStyle: forcePathStyleValue
      ? forcePathStyleValue === 'true'
      : !isProduction,
    ...(resolvedEndpoint ? { endpoint: resolvedEndpoint } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : isProduction
        ? {}
        : {
            credentials: {
              accessKeyId: DEFAULT_OBJECT_STORAGE_ACCESS_KEY,
              secretAccessKey: DEFAULT_OBJECT_STORAGE_SECRET_KEY,
            },
          }),
  };

  return new S3Client(clientConfig);
}

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: OBJECT_STORAGE_CLIENT,
      inject: [ConfigService],
      useFactory: createClient,
    },
    ObjectStorageService,
  ],
  exports: [ObjectStorageService],
})
export class StorageModule {}
