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
import { ReservationsService } from './reservations.service';
import { Roles, CurrentUser } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  reservationCreateRequestSchema,
  reservationReadyRequestSchema,
  reservationFulfillRequestSchema,
  reservationStatusSchema,
  type ReservationCreateRequest,
  type ReservationReadyRequest,
  type ReservationFulfillRequest,
  type ReservationResponse,
  type ReservationListResponse,
  type ReservationActionResponse,
  type ReservationStatus,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('reservations')
@Roles('ORG_ADMIN', 'LIBRARIAN')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('memberId') memberId?: string,
    @Query('bookId') bookId?: string,
    @Query('status') status?: string,
  ): Promise<ReservationListResponse> {
    return this.reservationsService.findAll(this.requireOrganizationId(user), {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      memberId,
      bookId,
      status: status ? this.parseStatus(status) : undefined,
    });
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ReservationResponse> {
    return this.reservationsService.findOne(
      this.requireOrganizationId(user),
      id,
    );
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @Body(new ZodValidationPipe(reservationCreateRequestSchema))
    body: ReservationCreateRequest,
  ): Promise<ReservationResponse> {
    return this.reservationsService.create(
      this.requireOrganizationId(user),
      body,
    );
  }

  @Patch(':id/ready')
  async markReady(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reservationReadyRequestSchema))
    body: ReservationReadyRequest,
  ): Promise<ReservationActionResponse> {
    const reservation = await this.reservationsService.markReady(
      this.requireOrganizationId(user),
      id,
      body,
    );

    return { message: 'Reservation marked ready for pickup', reservation };
  }

  @Patch(':id/fulfill')
  async fulfill(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reservationFulfillRequestSchema))
    body: ReservationFulfillRequest,
  ): Promise<ReservationActionResponse> {
    const reservation = await this.reservationsService.fulfill(
      this.requireOrganizationId(user),
      id,
      user.id,
      body,
    );

    return { message: 'Reservation fulfilled', reservation };
  }

  @Patch(':id/cancel')
  async cancel(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<ReservationActionResponse> {
    const reservation = await this.reservationsService.cancel(
      this.requireOrganizationId(user),
      id,
    );

    return { message: 'Reservation cancelled', reservation };
  }

  private requireOrganizationId(user: User): string {
    if (!user.organizationId) {
      throw new ForbiddenException('User is not scoped to an organization');
    }

    return user.organizationId;
  }

  private parseStatus(status: string): ReservationStatus {
    const result = reservationStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return result.data;
  }
}
