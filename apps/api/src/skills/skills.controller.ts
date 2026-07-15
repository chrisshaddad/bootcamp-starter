import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { SkillsService } from './skills.service';
import type { User } from '@repo/db';
import {
  skillCreateRequestSchema,
  skillUpdateRequestSchema,
  skillListQuerySchema,
  type SkillCreateRequest,
  type SkillUpdateRequest,
  type SkillListQuery,
  type SkillResponse,
  type SkillListResponse,
} from '@repo/contracts';

@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(skillListQuerySchema)) query: SkillListQuery,
  ): Promise<SkillListResponse> {
    return this.skillsService.findAll(query, user);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<SkillResponse> {
    return this.skillsService.findOne(id, user);
  }

  @Post()
  @Roles('HR', 'ORG_ADMIN')
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(skillCreateRequestSchema))
    body: SkillCreateRequest,
  ): Promise<SkillResponse> {
    return this.skillsService.create(body, user);
  }

  @Patch(':id')
  @Roles('HR', 'ORG_ADMIN')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(skillUpdateRequestSchema))
    body: SkillUpdateRequest,
  ): Promise<SkillResponse> {
    return this.skillsService.update(id, body, user);
  }

  @Delete(':id')
  @Roles('HR', 'ORG_ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.skillsService.delete(id, user);
  }
}
