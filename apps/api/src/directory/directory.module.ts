import { Module } from '@nestjs/common';
import { DirectoryController } from './directory.controller';
import { DirectoryService } from './directory.service';

// PrismaService (DatabaseModule) is global, so this module needs no imports of
// its own. Read-only public directory — no MailModule/AuditModule needed.
@Module({
  controllers: [DirectoryController],
  providers: [DirectoryService],
})
export class DirectoryModule {}
