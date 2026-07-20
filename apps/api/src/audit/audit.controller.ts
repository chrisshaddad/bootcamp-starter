import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import { ZodValidationPipe } from '../common/pipes';
import { auditLogListRequestSchema } from '@repo/contracts';
import type { AuditLogListRequest } from '@repo/contracts';
import { AuditService } from './audit.service';
import { ApiAuditLogListResponse } from './audit.swagger';

@ApiTags('audit-logs')
@ApiCookieAuth('session-cookie')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Retrieves a paginated list of audit logs.
   */
  @Get()
  @Roles('ORG_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'entityType', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiAuditLogListResponse()
  async list(
    @CurrentUser() user: User,
    @Query(new ZodValidationPipe(auditLogListRequestSchema))
    filters: AuditLogListRequest,
  ) {
    const gymId = user.role === 'SUPER_ADMIN' ? null : user.gymId;
    return this.auditService.list(gymId, filters);
  }
}
