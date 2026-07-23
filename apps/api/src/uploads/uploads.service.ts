import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  v2 as cloudinary,
  type UploadApiResponse,
  type UploadApiErrorResponse,
} from 'cloudinary';
import { Readable } from 'stream';
import type { ImageUploadResponse } from '@repo/contracts';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private configured = false;

  constructor() {
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      this.configured = true;
      this.logger.log('Cloudinary client configured');
    } else {
      this.logger.warn(
        'CLOUDINARY_* env vars not set. Image upload functionality disabled.',
      );
    }
  }

  async uploadImage(
    organizationId: string,
    file: Express.Multer.File,
  ): Promise<ImageUploadResponse> {
    if (!this.configured) {
      throw new ServiceUnavailableException('Image upload is not configured');
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `nextshelf/${organizationId}`, resource_type: 'image' },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error || !result) {
            reject(
              new Error(
                error?.message ?? 'Cloudinary upload returned no result',
              ),
            );
            return;
          }
          resolve(result);
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });

    return { url: result.secure_url };
  }
}
