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
import { ReservationsService } from './reservations.service';
import { Roles, CurrentUser, OrganizationId } from '../auth/decorators';
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
    @OrganizationId() organizationId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('memberId') memberId?: string,
    @Query('bookId') bookId?: string,
    @Query('status') status?: string,
  ): Promise<ReservationListResponse> {
    return this.reservationsService.findAll(organizationId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      memberId,
      bookId,
      status: status ? this.parseStatus(status) : undefined,
    });
  }

  @Get(':id')
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<ReservationResponse> {
    return this.reservationsService.findOne(organizationId, id);
  }

  @Post()
  async create(
    @OrganizationId() organizationId: string,
    @Body(new ZodValidationPipe(reservationCreateRequestSchema))
    body: ReservationCreateRequest,
  ): Promise<ReservationResponse> {
    return this.reservationsService.create(organizationId, body);
  }

  @Patch(':id/ready')
  async markReady(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reservationReadyRequestSchema))
    body: ReservationReadyRequest,
  ): Promise<ReservationActionResponse> {
    const reservation = await this.reservationsService.markReady(
      organizationId,
      id,
      body,
    );

    return { message: 'Reservation marked ready for pickup', reservation };
  }

  @Patch(':id/fulfill')
  async fulfill(
    @OrganizationId() organizationId: string,
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reservationFulfillRequestSchema))
    body: ReservationFulfillRequest,
  ): Promise<ReservationActionResponse> {
    const reservation = await this.reservationsService.fulfill(
      organizationId,
      id,
      user.id,
      body,
    );

    return { message: 'Reservation fulfilled', reservation };
  }

  @Patch(':id/cancel')
  async cancel(
    @OrganizationId() organizationId: string,
    @Param('id') id: string,
  ): Promise<ReservationActionResponse> {
    const reservation = await this.reservationsService.cancel(
      organizationId,
      id,
    );

    return { message: 'Reservation cancelled', reservation };
  }

  private parseStatus(status: string): ReservationStatus {
    const result = reservationStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return result.data;
  }
}
