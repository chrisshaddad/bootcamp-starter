import { Controller, Get } from '@nestjs/common';
import type {
  BranchStatsResponse,
  PharmacyStatsResponse,
  PlatformStatsResponse,
} from '@repo/contracts';
import type { User } from '@repo/db';
import { CurrentUser, Roles } from '../auth/decorators';
import { StatsService } from './stats.service';

// Dashboard KPI counts. The global AuthGuard already requires a valid session;
// the class-level @Roles restricts the platform route to super-admins, while
// each dashboard handler overrides it with its own role (the RolesGuard reads
// the most specific @Roles via getAllAndOverride). Every scoped handler derives
// its tenant from the session actor, never the request.
@Controller('stats')
@Roles('SUPER_ADMIN')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('platform')
  platform(): Promise<PlatformStatsResponse> {
    return this.statsService.platform();
  }

  @Get('pharmacy')
  @Roles('PHARMACY_ADMIN')
  pharmacy(@CurrentUser() actor: User): Promise<PharmacyStatsResponse> {
    return this.statsService.pharmacy(actor);
  }

  @Get('branch')
  @Roles('PHARMACY_MANAGER', 'PHARMACY_EMPLOYEE')
  branch(@CurrentUser() actor: User): Promise<BranchStatsResponse> {
    return this.statsService.branch(actor);
  }
}
