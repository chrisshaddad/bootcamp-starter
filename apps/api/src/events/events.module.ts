import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PublicEventsController } from './public-events.controller';

@Module({
  providers: [EventsService],
  controllers: [EventsController, PublicEventsController],
})
export class EventsModule {}
