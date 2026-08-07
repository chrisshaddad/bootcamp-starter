import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { S3Client } from '@aws-sdk/client-s3';
import { ObjectStorageService } from './storage.service';

describe('ObjectStorageService', () => {
  const send = jest.fn<Promise<unknown>, [unknown]>();
  const service = new ObjectStorageService(
    { send } as unknown as S3Client,
    new ConfigService({
      OBJECT_STORAGE_BUCKET: 'test-bucket',
      OBJECT_STORAGE_PUBLIC_URL: 'http://localhost:9000/test-bucket',
    }),
  );

  beforeEach(() => jest.clearAllMocks());

  it('uploads an object and returns an encoded public URL', async () => {
    send.mockResolvedValue({});

    await expect(
      service.upload(
        'project-media/project id/image.png',
        Buffer.from('image'),
        'image/png',
      ),
    ).resolves.toEqual({
      key: 'project-media/project id/image.png',
      publicUrl:
        'http://localhost:9000/test-bucket/project-media/project%20id/image.png',
    });
  });

  it('extracts only keys belonging to the configured bucket', () => {
    expect(
      service.keyFromPublicUrl(
        'http://localhost:9000/test-bucket/project-media/a%20b.png',
      ),
    ).toBe('project-media/a b.png');
    expect(
      service.keyFromPublicUrl('https://example.com/test-bucket/image.png'),
    ).toBeNull();
  });

  it('deduplicates keys before deletion', async () => {
    send.mockResolvedValue({});

    await service.deleteMany(['one.png', 'one.png', 'two.png']);

    expect(send).toHaveBeenCalledTimes(1);
    const command = send.mock.calls[0]?.[0] as {
      input: { Delete: { Objects: Array<{ Key: string }> } };
    };
    expect(command.input.Delete.Objects).toEqual([
      { Key: 'one.png' },
      { Key: 'two.png' },
    ]);
  });

  it('maps provider failures to a stable service error', async () => {
    send.mockRejectedValue(new Error('connection refused'));

    await expect(
      service.upload('image.png', Buffer.from('image'), 'image/png'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
