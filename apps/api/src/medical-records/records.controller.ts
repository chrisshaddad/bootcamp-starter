import {
  Controller,
  Get,
  Param,
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
import type { RecordDetailResponse, RecordFileResponse } from '@repo/contracts';

@Controller('records')
export class RecordsController {
  constructor(private readonly recordsService: MedicalRecordsService) {}

  @Get(':id')
  @Roles('INSTITUTION_ADMIN', 'PROFESSIONAL', 'PATIENT')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<RecordDetailResponse> {
    return this.recordsService.findOne(id, user);
  }

  @Post(':id/files')
  @Roles('PROFESSIONAL')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: UploadedFileData,
    @CurrentUser() user: User,
  ): Promise<RecordFileResponse> {
    return this.recordsService.addFile(id, file, user);
  }

  @Get(':id/files/:fileId/download')
  @Roles('INSTITUTION_ADMIN', 'PROFESSIONAL', 'PATIENT')
  async downloadFile(
    @Param('id') id: string,
    @Param('fileId') fileId: string,
    @CurrentUser() user: User,
  ): Promise<StreamableFile> {
    const { stream, fileName, mimeType } =
      await this.recordsService.downloadFile(id, fileId, user);

    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `attachment; filename="${fileName}"`,
    });
  }
}
