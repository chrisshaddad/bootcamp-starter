import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  publicEventListQuerySchema,
  type PublicEventDetailResponse,
  type PublicEventListQuery,
  type PublicEventListResponse,
} from '@repo/contracts';
import { Public } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { EventsService } from './events.service';

@Controller('public/events')
export class PublicEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @Public()
  async findAll(
    @Query(
      new ZodValidationPipe<PublicEventListQuery>(publicEventListQuerySchema),
    )
    query: PublicEventListQuery,
  ): Promise<PublicEventListResponse> {
    return this.eventsService.findPublicAll(query);
  }

  @Get(':id')
  @Public()
  async findOne(@Param('id') id: string): Promise<PublicEventDetailResponse> {
    return this.eventsService.findPublicOne(id);
  }
}
