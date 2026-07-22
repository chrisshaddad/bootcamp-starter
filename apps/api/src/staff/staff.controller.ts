import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { Roles, OrganizationId, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  staffInviteRequestSchema,
  staffRoleUpdateRequestSchema,
  type StaffInviteRequest,
  type StaffRoleUpdateRequest,
  type StaffResponse,
  type StaffListResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('staff')
@Roles('ORG_ADMIN')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('search') search?: string,
  ): Promise<StaffListResponse> {
    return this.staffService.findAll(organizationId, { search });
  }

  @Post()
  async invite(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(staffInviteRequestSchema))
    body: StaffInviteRequest,
  ): Promise<StaffResponse> {
    return this.staffService.invite(organizationId, body);
  }

  @Patch(':id/role')
  async changeRole(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(staffRoleUpdateRequestSchema))
    body: StaffRoleUpdateRequest,
  ): Promise<StaffResponse> {
    return this.staffService.changeRole(organizationId, id, user.id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.staffService.remove(organizationId, id, user.id);
  }
}
