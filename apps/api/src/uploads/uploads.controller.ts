import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { Roles, OrganizationId } from '../auth/decorators';
import type { ImageUploadResponse } from '@repo/contracts';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB business limit -> clean 400
// multer's own limit is just a DoS backstop for memoryStorage buffering, set
// well above the business limit so MaxFileSizeValidator (not multer's raw
// MulterError) is what rejects an oversized file with a clean 400.
const MEMORY_HARD_CEILING_BYTES = 15 * 1024 * 1024;

@Controller('uploads')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MEMORY_HARD_CEILING_BYTES },
    }),
  )
  async uploadImage(
    @OrganizationId() organizationId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^image\/(jpeg|png|gif|webp|avif)$/,
          skipMagicNumbersValidation: true,
        })
        .addMaxSizeValidator({
          maxSize: MAX_FILE_SIZE_BYTES,
          errorMessage: 'Image must be 5MB or smaller',
        })
        .build({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    file: Express.Multer.File,
  ): Promise<ImageUploadResponse> {
    return this.uploadsService.uploadImage(organizationId, file);
  }
}
