import { Controller, Get, Param, Query } from '@nestjs/common';
import { StatsService } from './stats.service';
import { Roles, CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import type { User } from '@repo/db';
import {
  statsEventListQuerySchema,
  statsListQuerySchema,
  type StatsEventDetailResponse,
  type StatsEventListQuery,
  type StatsEventListResponse,
  type StatsListQuery,
  type StatsMemberListResponse,
  type StatsOverviewResponse,
  type StatsUserDetailResponse,
  type StatsUserListResponse,
} from '@repo/contracts';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('overview')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async getOverview(
    @Query(new ZodValidationPipe<StatsListQuery>(statsListQuerySchema))
    query: StatsListQuery,
    @CurrentUser() user: User,
  ): Promise<StatsOverviewResponse> {
    return this.statsService.getOverview(query, user);
  }

  @Get('events')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async getEventStats(
    @Query(
      new ZodValidationPipe<StatsEventListQuery>(statsEventListQuerySchema),
    )
    query: StatsEventListQuery,
    @CurrentUser() user: User,
  ): Promise<StatsEventListResponse> {
    return this.statsService.getEventStats(query, user);
  }

  @Get('events/:id')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async getEventStat(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<StatsEventDetailResponse> {
    return this.statsService.getEventStat(id, user);
  }

  @Get('users')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async getUserStats(
    @Query(new ZodValidationPipe<StatsListQuery>(statsListQuerySchema))
    query: StatsListQuery,
    @CurrentUser() user: User,
  ): Promise<StatsUserListResponse> {
    return this.statsService.getUserStats(query, user);
  }

  @Get('users/:userId')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async getUserStat(
    @Param('userId') userId: string,
    @Query(new ZodValidationPipe<StatsListQuery>(statsListQuerySchema))
    query: StatsListQuery,
    @CurrentUser() user: User,
  ): Promise<StatsUserDetailResponse> {
    return this.statsService.getUserStat(userId, query, user);
  }

  @Get('members')
  @Roles('SUPER_ADMIN', 'ORG_ADMIN')
  async getMemberStats(
    @Query(new ZodValidationPipe<StatsListQuery>(statsListQuerySchema))
    query: StatsListQuery,
    @CurrentUser() user: User,
  ): Promise<StatsMemberListResponse> {
    return this.statsService.getMemberStats(query, user);
  }
}
