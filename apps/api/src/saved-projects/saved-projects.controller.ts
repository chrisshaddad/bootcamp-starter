import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SavedProjectsService } from './saved-projects.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AccountType } from '@repo/db';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  savedProjectCreateRequestSchema,
  savedProjectsListQuerySchema,
  savedProjectNoteUpdateRequestSchema,
  type SavedProjectCreateRequest,
  type SavedProjectsListQuery,
  type SavedProjectNoteUpdateRequest,
  type SavedProjectResponse,
  type SavedProjectsResponse,
  type SavedProjectIdsResponse,
} from '@repo/contracts';

@ApiTags('saved-projects')
@ApiCookieAuth('session')
@Controller('saved-projects')
@Roles(AccountType.HIRING)
export class SavedProjectsController {
  constructor(private readonly savedProjectsService: SavedProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Save a published project for the current user' })
  @ApiResponse({ status: 201, description: 'Project saved.' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async saveProject(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(savedProjectCreateRequestSchema))
    body: SavedProjectCreateRequest,
  ): Promise<SavedProjectResponse> {
    const saved = await this.savedProjectsService.saveProject(
      userId,
      body.projectId,
      body.note,
    );

    return {
      id: saved.id,
      projectId: saved.projectId,
      savedByUserId: saved.savedByUserId,
      note: saved.note,
      createdAt: saved.createdAt.toISOString(),
    };
  }

  @Patch(':projectId')
  @ApiOperation({ summary: "Update a saved project's note" })
  @ApiResponse({ status: 200, description: 'Note updated.' })
  @ApiResponse({ status: 404, description: 'Saved project not found.' })
  async updateNote(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Body(new ZodValidationPipe(savedProjectNoteUpdateRequestSchema))
    body: SavedProjectNoteUpdateRequest,
  ): Promise<SavedProjectResponse> {
    const updated = await this.savedProjectsService.updateNote(
      userId,
      projectId,
      body.note,
    );

    return {
      id: updated.id,
      projectId: updated.projectId,
      savedByUserId: updated.savedByUserId,
      note: updated.note,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  @Delete(':projectId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unsave a project for the current user' })
  @ApiResponse({ status: 204, description: 'Project unsaved.' })
  async unsaveProject(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
  ): Promise<void> {
    await this.savedProjectsService.unsaveProject(userId, projectId);
  }

  @Get('ids')
  @ApiOperation({
    summary: "List the current user's saved project ids (lightweight)",
  })
  @ApiResponse({ status: 200, description: 'Saved project ids.' })
  async listSavedProjectIds(
    @CurrentUser('id') userId: string,
  ): Promise<SavedProjectIdsResponse> {
    return this.savedProjectsService.listSavedProjectIds(userId);
  }

  @Get()
  @ApiOperation({ summary: "List the current user's saved projects" })
  @ApiResponse({
    status: 200,
    description: 'Paginated saved projects list successfully retrieved.',
  })
  async listSavedProjects(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(savedProjectsListQuerySchema))
    query: SavedProjectsListQuery,
  ): Promise<SavedProjectsResponse> {
    return this.savedProjectsService.listSavedProjects(userId, query);
  }
}
