import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { AiInsightsService } from './ai-insights.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  aiInsightGenerateRequestSchema,
  type AiInsightGenerateRequest,
  type AiInsightListResponse,
} from '@repo/contracts';

@Controller('ai-insights')
export class AiInsightsController {
  constructor(private readonly aiInsightsService: AiInsightsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
  ): Promise<AiInsightListResponse> {
    return this.aiInsightsService.findAll(user.organizationId!, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      type,
    });
  }

  @Post('generate')
  async generate(
    @Body(new ZodValidationPipe(aiInsightGenerateRequestSchema))
    body: AiInsightGenerateRequest,
    @CurrentUser() user: User,
  ): Promise<{ message: string; jobId: string }> {
    return this.aiInsightsService.requestGeneration(user.organizationId!, body);
  }
}
