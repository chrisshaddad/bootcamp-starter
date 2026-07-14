import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReservationsService } from '../circulation/reservations.service';
import { LibraryMembersService } from '../library-members/library-members.service';
import { Roles, CurrentUser, ActiveOrganizationId } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  reservationCreateSelfRequestSchema,
  reservationStatusSchema,
  type ReservationCreateSelfRequest,
  type ReservationResponse,
  type ReservationListResponse,
  type ReservationStatus,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('portal/reservations')
@Roles('MEMBER')
export class PortalReservationsController {
  constructor(
    private readonly reservationsService: ReservationsService,
    private readonly libraryMembersService: LibraryMembersService,
  ) {}

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ): Promise<ReservationListResponse> {
    const organizationId = this.requireActiveOrganization(activeOrganizationId);
    const member = await this.libraryMembersService.findByUser(
      organizationId,
      user.id,
    );

    return this.reservationsService.findAll(organizationId, {
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
  ): Promise<ReservationResponse> {
    const { organizationId, reservation } = await this.findOwnReservation(
      user,
      activeOrganizationId,
      id,
    );

    return reservation;
  }

  @Post()
  async create(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Body(new ZodValidationPipe(reservationCreateSelfRequestSchema))
    body: ReservationCreateSelfRequest,
  ): Promise<ReservationResponse> {
    const organizationId = this.requireActiveOrganization(activeOrganizationId);
    const member = await this.libraryMembersService.findByUser(
      organizationId,
      user.id,
    );

    return this.reservationsService.create(organizationId, {
      bookId: body.bookId,
      memberId: member.id,
    });
  }

  @Patch(':id/cancel')
  async cancel(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Param('id') id: string,
  ): Promise<ReservationResponse> {
    const { organizationId } = await this.findOwnReservation(
      user,
      activeOrganizationId,
      id,
    );

    return this.reservationsService.cancel(organizationId, id);
  }

  // Shared by findOne/cancel: resolves the org + caller's own member row,
  // fetches the reservation (org-scoped only, per ReservationsService), then
  // enforces ownership. 404, not 403, so we don't confirm another patron's
  // reservation exists.
  private async findOwnReservation(
    user: User,
    activeOrganizationId: string | null,
    id: string,
  ): Promise<{ organizationId: string; reservation: ReservationResponse }> {
    const organizationId = this.requireActiveOrganization(activeOrganizationId);
    const member = await this.libraryMembersService.findByUser(
      organizationId,
      user.id,
    );

    const reservation = await this.reservationsService.findOne(
      organizationId,
      id,
    );

    if (reservation.memberId !== member.id) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return { organizationId, reservation };
  }

  private requireActiveOrganization(
    activeOrganizationId: string | null,
  ): string {
    if (!activeOrganizationId) {
      throw new BadRequestException('Select a library first');
    }

    return activeOrganizationId;
  }

  private parseStatus(status: string): ReservationStatus {
    const result = reservationStatusSchema.safeParse(status);

    if (!result.success) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    return result.data;
  }
}
