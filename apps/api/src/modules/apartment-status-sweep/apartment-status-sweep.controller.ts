import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApartmentStatusSweepService } from './apartment-status-sweep.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';

/**
 * Manual "sweep now" trigger for the apartment-status expiry sweep (F4.2).
 * Runs the same idempotent core the daily scheduler runs, scoped to the
 * caller's org. Mounted at `/apartments` (not a dedicated top-level path)
 * since a status sweep reads most naturally as an apartments action; it
 * does not collide with the nested
 * buildings/:buildingId/floors/:floorId/apartments controller since Nest
 * matches on the full path.
 */
@ApiTags('apartments')
@ApiBearerAuth()
@Controller('apartments')
@Roles(Role.ORG_ADMIN)
export class ApartmentStatusSweepController {
  constructor(
    private readonly apartmentStatusSweep: ApartmentStatusSweepService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Post('status-sweep')
  async runSweep(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.apartmentStatusSweep.sweepForOrg(orgId);
  }
}
