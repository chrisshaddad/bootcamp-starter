import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { CareerPathsService } from './career-paths.service';
import type { User } from '@repo/db';
import {
  careerPathCreateRequestSchema,
  type CareerPathCreateRequest,
  type CareerPathResponse,
  type CareerPathListResponse,
} from '@repo/contracts';

@Controller('career-paths')
export class CareerPathsController {
  constructor(private readonly careerPathsService: CareerPathsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
  ): Promise<CareerPathListResponse> {
    return this.careerPathsService.findAll(user);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CareerPathResponse> {
    return this.careerPathsService.findOne(id, user);
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(careerPathCreateRequestSchema))
    body: CareerPathCreateRequest,
  ): Promise<CareerPathResponse> {
    return this.careerPathsService.create(body, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.careerPathsService.delete(id, user);
  }
}
