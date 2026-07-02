import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { OrgScopeService } from '@/common/org-scope/org-scope.service';
import { CurrentUser, Roles } from '@/common/decorators';
import { AuthenticatedUser } from '@/common/types/authenticated-user.type';
import { Role } from '@/common/enums';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { ConfirmSessionDto } from './dto/confirm-session.dto';

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly orgScope: OrgScopeService,
  ) {}

  @Roles(Role.ORG_ADMIN, Role.FINANCE)
  @Get('subscription')
  async getSubscription(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.billingService.getSubscription(orgId);
  }

  // Auth-only (no @Roles) — freshly registered users have NO role yet (the
  // role is granted only on payment) but must reach checkout. orgId comes from
  // the token's org_id claim, set at provisioning; resolveOrgId requires no role.
  @Post('checkout-session')
  async createCheckoutSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const orgId = await this.orgScope.resolveOrgId(user);
    return this.billingService.createCheckoutSession(
      orgId,
      user,
      dto.planKey,
      dto.locale ?? 'en',
    );
  }

  // Auth-only — confirm a completed Stripe session, activate org, assign role.
  // Caller is still roleless at this point, so resolve org without a role.
  @Post('confirm')
  async confirmSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmSessionDto,
  ) {
    const orgId = await this.orgScope.resolveOrgId(user);
    return this.billingService.confirmSession(orgId, user.sub, dto.sessionId);
  }

  @Roles(Role.ORG_ADMIN)
  @Post('portal-session')
  async createPortalSession(@CurrentUser() user: AuthenticatedUser) {
    const { orgId } = await this.orgScope.resolveForCaller(user);
    return this.billingService.createPortalSession(orgId);
  }
}
