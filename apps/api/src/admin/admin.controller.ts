import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccountType } from '@repo/db';
import {
  adminAccountListQuerySchema,
  adminAccountListResponseSchema,
  adminAccountResponseSchema,
  adminAccountStatusUpdateSchema,
  adminAuditLogListQuerySchema,
  adminAuditLogListResponseSchema,
  adminOverviewResponseSchema,
  adminProjectListQuerySchema,
  adminProjectListResponseSchema,
  adminProjectModerationSchema,
  adminProjectResponseSchema,
  type AdminAccountListQuery,
  type AdminAccountListResponse,
  type AdminAccountResponse,
  type AdminAccountStatusUpdate,
  type AdminAuditLogListQuery,
  type AdminAuditLogListResponse,
  type AdminOverviewResponse,
  type AdminProjectListQuery,
  type AdminProjectListResponse,
  type AdminProjectModeration,
  type AdminProjectResponse,
} from '@repo/contracts';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { toOpenApiSchema } from '../common/swagger/schemas';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiCookieAuth('session')
@Roles(AccountType.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get platform operational insights' })
  @ApiResponse({
    status: 200,
    schema: toOpenApiSchema(adminOverviewResponseSchema),
  })
  getOverview(): Promise<AdminOverviewResponse> {
    return this.adminService.getOverview();
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Search and filter platform accounts' })
  @ApiResponse({
    status: 200,
    schema: toOpenApiSchema(adminAccountListResponseSchema),
  })
  getAccounts(
    @Query(new ZodValidationPipe(adminAccountListQuerySchema))
    query: AdminAccountListQuery,
  ): Promise<AdminAccountListResponse> {
    return this.adminService.getAccounts(query);
  }

  @Patch('accounts/:id/status')
  @ApiOperation({ summary: 'Suspend or reactivate an account' })
  @ApiBody({ schema: toOpenApiSchema(adminAccountStatusUpdateSchema) })
  @ApiResponse({
    status: 200,
    schema: toOpenApiSchema(adminAccountResponseSchema),
  })
  updateAccountStatus(
    @CurrentUser('id') actorUserId: string,
    @Param('id') userId: string,
    @Body(new ZodValidationPipe(adminAccountStatusUpdateSchema))
    body: AdminAccountStatusUpdate,
  ): Promise<AdminAccountResponse> {
    return this.adminService.updateAccountStatus(actorUserId, userId, body);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Search and filter all projects' })
  @ApiResponse({
    status: 200,
    schema: toOpenApiSchema(adminProjectListResponseSchema),
  })
  getProjects(
    @Query(new ZodValidationPipe(adminProjectListQuerySchema))
    query: AdminProjectListQuery,
  ): Promise<AdminProjectListResponse> {
    return this.adminService.getProjects(query);
  }

  @Patch('projects/:id/moderation')
  @ApiOperation({ summary: 'Suspend or restore a project for moderation' })
  @ApiBody({ schema: toOpenApiSchema(adminProjectModerationSchema) })
  @ApiResponse({
    status: 200,
    schema: toOpenApiSchema(adminProjectResponseSchema),
  })
  moderateProject(
    @CurrentUser('id') actorUserId: string,
    @Param('id') projectId: string,
    @Body(new ZodValidationPipe(adminProjectModerationSchema))
    body: AdminProjectModeration,
  ): Promise<AdminProjectResponse> {
    return this.adminService.moderateProject(actorUserId, projectId, body);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Search immutable administrative audit logs' })
  @ApiResponse({
    status: 200,
    schema: toOpenApiSchema(adminAuditLogListResponseSchema),
  })
  getAuditLogs(
    @Query(new ZodValidationPipe(adminAuditLogListQuerySchema))
    query: AdminAuditLogListQuery,
  ): Promise<AdminAuditLogListResponse> {
    return this.adminService.getAuditLogs(query);
  }
}
