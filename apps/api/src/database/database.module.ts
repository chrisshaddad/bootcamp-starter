import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';

/** Auto-generated docstring */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
