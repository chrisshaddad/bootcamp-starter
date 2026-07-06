import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { ApplicationsService } from './applications.service';
import type { User } from '@repo/db';
import {
  applicationCreateRequestSchema,
  type ApplicationCreateRequest,
  type ApplicationResponse,
} from '@repo/contracts';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(applicationCreateRequestSchema))
    body: ApplicationCreateRequest,
  ): Promise<ApplicationResponse> {
    return this.applicationsService.create(body, user);
  }
}
