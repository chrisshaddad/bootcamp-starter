import { Controller, Get, Query } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { Roles, OrganizationId } from '../auth/decorators';
import type { PurchaseListResponse } from '@repo/contracts';

@Controller('purchases')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get()
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('memberId') memberId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PurchaseListResponse> {
    return this.purchasesService.findAll(organizationId, {
      memberId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
