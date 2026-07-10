import { Controller, Get, Query } from '@nestjs/common';
import {
  auditListQuerySchema,
  type AuditListQuery,
  type AuditListResponse,
} from '@repo/contracts';
import { Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { AuditService } from './audit.service';

// Super-admin audit log console. The global AuthGuard already requires a valid
// session; @Roles narrows access to platform admins. Read-only.
@Controller('audit')
@Roles('SUPER_ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(auditListQuerySchema))
    query: AuditListQuery,
  ): Promise<AuditListResponse> {
    return this.auditService.list(query);
  }
}
