import { Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

// Reuses StatsService (via StatsModule) as the assistant's read-only,
// tenant-scoped data source rather than touching Prisma directly.
@Module({
  imports: [StatsModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
