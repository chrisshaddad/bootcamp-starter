import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, type ReadStream } from 'fs';
import { unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

export interface SaveFileInput {
  buffer: Buffer;
  originalName: string;
}

export interface SavedFile {
  /** Opaque on-disk name; persisted as RecordFile.fileUrl and used to stream back. */
  storedName: string;
}

/**
 * Local-disk file storage for medical record attachments.
 *
 * MVP implementation writes to `apps/api/uploads/`. The public surface
 * (`saveFile` / `getFileStream` / `deleteFile`) is deliberately storage-agnostic
 * so it can be swapped for S3 (or any object store) without touching callers —
 * only the body of these methods would change.
 */
@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly uploadDir = join(process.cwd(), 'uploads');

  constructor() {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory at ${this.uploadDir}`);
    }
  }

  async saveFile({ buffer, originalName }: SaveFileInput): Promise<SavedFile> {
    const storedName = `${randomUUID()}${extname(originalName)}`;
    await writeFile(join(this.uploadDir, storedName), buffer);
    return { storedName };
  }

  getFileStream(storedName: string): ReadStream {
    return createReadStream(this.resolve(storedName));
  }

  fileExists(storedName: string): boolean {
    return existsSync(this.resolve(storedName));
  }

  async deleteFile(storedName: string): Promise<void> {
    await unlink(this.resolve(storedName)).catch(() => {
      this.logger.warn(`Failed to delete file ${storedName} (already gone?)`);
    });
  }

  // Guard against path traversal — only ever touch files inside uploadDir.
  private resolve(storedName: string): string {
    return join(this.uploadDir, join('/', storedName));
  }
}
