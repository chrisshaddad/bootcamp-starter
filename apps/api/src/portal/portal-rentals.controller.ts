import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { RentalsService } from '../circulation/rentals.service';
import { LibraryMembersService } from '../library-members/library-members.service';
import { Roles, CurrentUser, ActiveOrganizationId } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  rentalStatusSchema,
  type RentalResponse,
  type RentalListResponse,
  type RentalStatus,
} from '@repo/contracts';

@Controller('portal/rentals')
@Roles('MEMBER')
export class PortalRentalsController {
  constructor(
    private readonly rentalsService: RentalsService,
    private readonly libraryMembersService: LibraryMembersService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ): Promise<RentalListResponse> {
    const organizationId = this.requireActiveOrganization(activeOrganizationId);
    const member = await this.libraryMembersService.findByUser(
      organizationId,
      user.id,
    );

    // memberId is always the caller's own - never client-suppliable.
    return this.rentalsService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      memberId: member.id,
      status: status ? this.parseStatus(status) : undefined,
    });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Param('id') id: string,
  ): Promise<RentalResponse> {
    const organizationId = this.requireActiveOrganization(activeOrganizationId);
    const member = await this.libraryMembersService.findByUser(
      organizationId,
      user.id,
    );

    const rental = await this.rentalsService.findOne(organizationId, id);

    // RentalsService.findOne is org-scoped only (written for trusted staff) -
    // add the ownership check here. 404, not 403, so we don't confirm
    // another patron's rental exists.
    if (rental.memberId !== member.id) {
      throw new NotFoundException(`Rental with ID ${id} not found`);
    }

    return rental;
  }

  private requireActiveOrganization(
    activeOrganizationId: string | null,
  ): string {
    if (!activeOrganizationId) {
      throw new BadRequestException('Select a library first');
    }

    return activeOrganizationId;
  }

  private parseStatus(status: string): RentalStatus {
    const result = rentalStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return result.data;
  }
}
