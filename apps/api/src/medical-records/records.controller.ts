import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  MedicalRecordsService,
  type UploadedFile as UploadedFileData,
} from './medical-records.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  recordCreateRequestSchema,
  type RecordCreateRequest,
  type RecordDetailResponse,
  type RecordFileResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

// Attachment upload limits — medical-record files are documents/images.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/tiff',
]);

/**
 * Build a safe Content-Disposition header. The file name is user-controlled, so
 * we (a) sanitize the ASCII `filename` fallback to prevent header injection and
 * (b) provide an RFC 5987 UTF-8 `filename*` so non-ASCII names survive.
 */
function contentDisposition(fileName: string): string {
  const asciiFallback = sanitizeFileName(fileName);
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

// Strip control chars (incl. CR/LF), quotes and backslash, and map any
// remaining non-ASCII to underscore so the ASCII fallback can't inject headers.
function sanitizeFileName(fileName: string): string {
  return Array.from(fileName)
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code < 0x20 || code === 0x7f) return '_';
      if (ch === '"' || ch === '\\') return '_';
      if (code > 0x7e) return '_';
      return ch;
    })
    .join('');
}

@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) {}

  @Get(':id')
  @Roles('PROFESSIONAL', 'PATIENT')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<RecordDetailResponse> {
    return this.recordsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles('PROFESSIONAL')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(recordCreateRequestSchema))
    body: RecordCreateRequest,
    @CurrentUser() user: User,
  ): Promise<RecordDetailResponse> {
    return this.recordsService.update(id, body, user);
  }

  @Delete(':id')
  @Roles('PROFESSIONAL')
  @HttpCode(204)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.recordsService.remove(id, user);
  }

  @Post(':id/files')
  @Roles('PROFESSIONAL')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
          cb(
            new BadRequestException(`Unsupported file type: ${file.mimetype}`),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: UploadedFileData,
    @CurrentUser() user: User,
  ): Promise<RecordFileResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.recordsService.addFile(id, file, user);
  }

  @Get(':id/files/:fileId/download')
  @Roles('PROFESSIONAL', 'PATIENT')
  async downloadFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: User,
  ): Promise<StreamableFile> {
    const { stream, fileName, mimeType } =
      await this.recordsService.downloadFile(id, fileId, user);

    return new StreamableFile(stream, {
      type: mimeType,
      disposition: contentDisposition(fileName),
    });
  }
}
