import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import {
  auditListQuerySchema,
  type AuditListQuery,
  type AuditListResponse,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { CurrentUser, Roles } from '../auth/decorators';
import { ZodValidationPipe } from '../common/pipes';
import { AuditService } from './audit.service';

// Audit log console. The global AuthGuard already requires a valid session; the
// class-level @Roles restricts the cross-tenant listing to super-admins, while
// the pharmacy route overrides it with PHARMACY_ADMIN (the RolesGuard reads the
// most specific @Roles via getAllAndOverride). Read-only.
@Controller('audit')
@Roles('SUPER_ADMIN')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // Platform-wide, cross-tenant listing for the super-admin console.
  @Get()
  list(
    @Query(new ZodValidationPipe(auditListQuerySchema))
    query: AuditListQuery,
  ): Promise<AuditListResponse> {
    return this.auditService.list(query);
  }

  // Pharmacy-scoped listing for the pharmacy-admin console — restricted to the
  // caller's own pharmacy staff. Scope comes from the session, never the query.
  @Get('pharmacy')
  @Roles('PHARMACY_ADMIN')
  pharmacyList(
    @Query(new ZodValidationPipe(auditListQuerySchema))
    query: AuditListQuery,
    @CurrentUser() actor: User,
  ): Promise<AuditListResponse> {
    // A PHARMACY_ADMIN always carries a pharmacyId, but fail closed so a
    // mis-scoped account can never fall through to an unscoped read.
    if (!actor.pharmacyId) {
      throw new ForbiddenException(
        'Your account is not attached to a pharmacy.',
      );
    }
    return this.auditService.listForPharmacy(actor.pharmacyId, query);
  }
}
