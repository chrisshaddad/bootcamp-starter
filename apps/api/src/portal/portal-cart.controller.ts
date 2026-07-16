import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { CartService } from '../commerce/cart.service';
import { LibraryMembersService } from '../library-members/library-members.service';
import { Roles, CurrentUser, ActiveOrganizationId } from '../auth/decorators';
import type { User } from '@repo/db';
import {
  cartAddItemRequestSchema,
  type CartAddItemRequest,
  type CartResponse,
  type CheckoutResponse,
} from '@repo/contracts';
import { ZodValidationPipe } from '../common/pipes';

@Controller('portal/cart')
@Roles('MEMBER')
export class PortalCartController {
  constructor(
    private readonly cartService: CartService,
    private readonly libraryMembersService: LibraryMembersService,
  ) {}

  @Get()
  async getCart(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
  ): Promise<CartResponse> {
    const organizationId = this.requireActiveOrganization(activeOrganizationId);
    const member = await this.libraryMembersService.findByUser(
      organizationId,
      user.id,
    );

    return this.cartService.getCart(organizationId, member.id);
  }

  @Post('items')
  async addItem(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Body(new ZodValidationPipe(cartAddItemRequestSchema))
    body: CartAddItemRequest,
  ): Promise<CartResponse> {
    const organizationId = this.requireActiveOrganization(activeOrganizationId);
    const member = await this.libraryMembersService.findByUser(
      organizationId,
      user.id,
    );

    return this.cartService.addItem(organizationId, member.id, body);
  }

  @Delete('items/:itemId')
  async removeItem(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
    @Param('itemId') itemId: string,
  ): Promise<CartResponse> {
    const organizationId = this.requireActiveOrganization(activeOrganizationId);
    const member = await this.libraryMembersService.findByUser(
      organizationId,
      user.id,
    );

    return this.cartService.removeItem(organizationId, member.id, itemId);
  }

  @Post('checkout')
  async checkout(
    @CurrentUser() user: User,
    @ActiveOrganizationId() activeOrganizationId: string | null,
  ): Promise<CheckoutResponse> {
    const organizationId = this.requireActiveOrganization(activeOrganizationId);
    const member = await this.libraryMembersService.findByUser(
      organizationId,
      user.id,
    );

    return this.cartService.checkout(organizationId, member.id);
  }

  private requireActiveOrganization(
    activeOrganizationId: string | null,
  ): string {
    if (!activeOrganizationId) {
      throw new BadRequestException('Select a library first');
    }

    return activeOrganizationId;
  }
}
