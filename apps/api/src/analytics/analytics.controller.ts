import { randomUUID } from 'crypto';
import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AccountType } from '@repo/db';
import {
  analyticsOverviewResponseSchema,
  analyticsProjectResponseSchema,
  analyticsQuerySchema,
  analyticsTrackRequestSchema,
  analyticsTrackResponseSchema,
  uuidSchema,
  type AnalyticsOverviewResponse,
  type AnalyticsProjectResponse,
  type AnalyticsQuery,
  type AnalyticsTrackRequest,
  type AnalyticsTrackResponse,
} from '@repo/contracts';
import { CurrentUser, Public, Roles } from '../auth/decorators';
import { SESSION_COOKIE_NAME } from '../auth/guards/auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { toOpenApiSchema } from '../common/swagger/schemas';
import {
  ANALYTICS_VISITOR_COOKIE,
  ANALYTICS_VISITOR_COOKIE_MAX_AGE_MS,
} from './analytics.constants';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('events')
  @Public()
  @HttpCode(202)
  @ApiOperation({ summary: 'Queue an anonymous portfolio analytics event' })
  @ApiBody({ schema: toOpenApiSchema(analyticsTrackRequestSchema) })
  @ApiResponse({
    status: 202,
    schema: toOpenApiSchema(analyticsTrackResponseSchema),
  })
  async track(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Headers('user-agent') userAgent: string | undefined,
    @Headers('dnt') doNotTrack: string | undefined,
    @Headers('referer') referrer: string | undefined,
    @Body(new ZodValidationPipe(analyticsTrackRequestSchema))
    body: AnalyticsTrackRequest,
  ): Promise<AnalyticsTrackResponse> {
    const existingVisitorId = request.cookies?.[ANALYTICS_VISITOR_COOKIE] as
      | string
      | undefined;
    const visitorId = existingVisitorId ?? randomUUID();
    const accepted = await this.analyticsService.queueVisit(body, {
      visitorId,
      sessionId: request.cookies?.[SESSION_COOKIE_NAME] as string | undefined,
      userAgent,
      doNotTrack,
      referrer,
    });
    if (accepted && !existingVisitorId) {
      response.cookie(ANALYTICS_VISITOR_COOKIE, visitorId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: ANALYTICS_VISITOR_COOKIE_MAX_AGE_MS,
      });
    }

    return analyticsTrackResponseSchema.parse({ accepted });
  }

  @Get('overview')
  @ApiCookieAuth('session')
  @Roles(AccountType.DEVELOPER)
  @ApiOperation({ summary: 'Get developer portfolio analytics' })
  @ApiResponse({
    status: 200,
    schema: toOpenApiSchema(analyticsOverviewResponseSchema),
  })
  async getOverview(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: AnalyticsQuery,
  ): Promise<AnalyticsOverviewResponse> {
    return analyticsOverviewResponseSchema.parse(
      await this.analyticsService.getOverview(userId, query.range),
    );
  }

  @Get('projects/:projectId')
  @ApiCookieAuth('session')
  @Roles(AccountType.DEVELOPER)
  @ApiOperation({ summary: 'Get analytics for one accessible project' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({
    status: 200,
    schema: toOpenApiSchema(analyticsProjectResponseSchema),
  })
  async getProject(
    @CurrentUser('id') userId: string,
    @Param('projectId', new ZodValidationPipe(uuidSchema)) projectId: string,
    @Query(new ZodValidationPipe(analyticsQuerySchema)) query: AnalyticsQuery,
  ): Promise<AnalyticsProjectResponse> {
    return analyticsProjectResponseSchema.parse(
      await this.analyticsService.getProject(userId, projectId, query.range),
    );
  }
}
