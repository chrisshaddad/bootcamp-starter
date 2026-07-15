import { Global, Module } from '@nestjs/common';
import { PrismaService, DatabaseService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService, DatabaseService],
  exports: [PrismaService, DatabaseService],
})
export class DatabaseModule {}
