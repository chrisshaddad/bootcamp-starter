import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

/** Auto-generated docstring */
@Module({
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
