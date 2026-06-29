import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrgService } from './org.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { UpdateOrgDto } from './dto/update-org.dto';

@ApiTags('org')
@ApiBearerAuth()
@Controller('org')
export class OrgController {
  constructor(
    private readonly orgService: OrgService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Get()
  async getOrg(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.orgService.findOne(orgId);
  }

  @Roles(Role.ORG_ADMIN)
  @Patch()
  async updateOrg(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrgDto,
  ) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.orgService.update(orgId, user.sub, dto);
  }
}
