import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import type { AlertListResponse, AlertResponse } from '@repo/contracts';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ): Promise<AlertListResponse> {
    return this.alertsService.findAll(user.organizationId!, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status,
    });
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<AlertResponse> {
    return this.alertsService.findOne(id, user.organizationId!);
  }

  @Patch(':id/dismiss')
  async dismiss(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<AlertResponse> {
    return this.alertsService.dismiss(id, user.organizationId!);
  }
}
