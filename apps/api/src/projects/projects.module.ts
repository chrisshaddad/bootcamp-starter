import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module'; // 1. IMPORT AuthModule

@Module({
  imports: [
    DatabaseModule,
    AuthModule, // 2. ADD IT TO THE IMPORTS ARRAY
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
