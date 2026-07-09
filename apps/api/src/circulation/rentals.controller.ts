import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  rentalCheckoutRequestSchema,
  rentalReturnRequestSchema,
  rentalLostRequestSchema,
  rentalStatusSchema,
  type RentalCheckoutRequest,
  type RentalReturnRequest,
  type RentalLostRequest,
  type RentalResponse,
  type RentalListResponse,
  type RentalActionResponse,
  type RentalStatus,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('rentals')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class RentalsController {
  constructor(private readonly rentalsService: RentalsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('memberId') memberId?: string,
    @Query('bookCopyId') bookCopyId?: string,
    @Query('status') status?: string,
  ): Promise<RentalListResponse> {
    return this.rentalsService.findAll(this.requireOrganizationId(user), {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      memberId,
      bookCopyId,
      status: status ? this.parseStatus(status) : undefined,
    });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<RentalResponse> {
    return this.rentalsService.findOne(this.requireOrganizationId(user), id);
  }

  @Post()
  async checkout(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(rentalCheckoutRequestSchema))
    body: RentalCheckoutRequest,
  ): Promise<RentalResponse> {
    return this.rentalsService.checkout(
      this.requireOrganizationId(user),
      user.id,
      body,
    );
  }

  @Patch(':id/return')
  async returnRental(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rentalReturnRequestSchema))
    body: RentalReturnRequest,
  ): Promise<RentalActionResponse> {
    const rental = await this.rentalsService.return(
      this.requireOrganizationId(user),
      id,
      body,
    );

    return { message: 'Rental returned successfully', rental };
  }

  @Patch(':id/lost')
  async markLost(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rentalLostRequestSchema))
    body: RentalLostRequest,
  ): Promise<RentalActionResponse> {
    const rental = await this.rentalsService.markLost(
      this.requireOrganizationId(user),
      id,
      body,
    );

    return { message: 'Rental marked as lost', rental };
  }

  @Patch(':id/pay-fine')
  async payFine(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<RentalActionResponse> {
    const rental = await this.rentalsService.payFine(
      this.requireOrganizationId(user),
      id,
    );

    return { message: 'Fine marked as paid', rental };
  }

  private requireOrganizationId(user: User): string {
    if (!user.organizationId) {
      throw new ForbiddenException('User is not scoped to an organization');
    }

    return user.organizationId;
  }

  private parseStatus(status: string): RentalStatus {
    const result = rentalStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return result.data;
  }
}
