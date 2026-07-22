import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { RentalsService } from './rentals.service';
import { Roles, CurrentUser, OrganizationId } from '../auth/decorators';
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
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('memberId') memberId?: string,
    @Query('bookCopyId') bookCopyId?: string,
    @Query('status') status?: string,
    @Query('overdue') overdue?: string,
  ): Promise<RentalListResponse> {
    return this.rentalsService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      memberId,
      bookCopyId,
      status: status ? this.parseStatus(status) : undefined,
      overdue: overdue === 'true',
    });
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<RentalResponse> {
    return this.rentalsService.findOne(organizationId, id);
  }

  @Post()
  async checkout(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(rentalCheckoutRequestSchema))
    body: RentalCheckoutRequest,
  ): Promise<RentalResponse> {
    return this.rentalsService.checkout(organizationId, user.id, body);
  }

  @Patch(':id/return')
  async returnRental(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rentalReturnRequestSchema))
    body: RentalReturnRequest,
  ): Promise<RentalActionResponse> {
    const rental = await this.rentalsService.return(organizationId, id, body);

    return { message: 'Rental returned successfully', rental };
  }

  @Patch(':id/lost')
  async markLost(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rentalLostRequestSchema))
    body: RentalLostRequest,
  ): Promise<RentalActionResponse> {
    const rental = await this.rentalsService.markLost(organizationId, id, body);

    return { message: 'Rental marked as lost', rental };
  }

  @Patch(':id/pay-fine')
  async payFine(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<RentalActionResponse> {
    const rental = await this.rentalsService.payFine(organizationId, id);

    return { message: 'Fine marked as paid', rental };
  }

  private parseStatus(status: string): RentalStatus {
    const result = rentalStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return result.data;
  }
}
