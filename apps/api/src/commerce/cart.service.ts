import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type BookCopyCondition } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type {
  CartResponse,
  CartAddItemRequest,
  CheckoutResponse,
} from '@repo/contracts';

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      book: {
        select: { id: true, title: true, coverUrl: true, salePrice: true },
      },
    },
  },
} satisfies Prisma.CartInclude;

type CartWithItems = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

const purchaseInclude = {
  bookCopy: {
    include: {
      book: { select: { id: true, title: true, coverUrl: true } },
    },
  },
} satisfies Prisma.PurchaseInclude;

type PurchaseWithBookCopy = Prisma.PurchaseGetPayload<{
  include: typeof purchaseInclude;
}>;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get (or lazily create) a patron's cart within an organization
   */
  async getCart(
    organizationId: string,
    memberId: string,
  ): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(organizationId, memberId);

    return this.toResponse(cart);
  }

  /**
   * Add a book to the patron's cart with an optional preferred condition.
   * Each add creates its own line item - copies are non-fungible, so adding
   * the same book twice means "claim two separate copies at checkout".
   */
  async addItem(
    organizationId: string,
    memberId: string,
    data: CartAddItemRequest,
  ): Promise<CartResponse> {
    const book = await this.prisma.book.findFirst({
      where: { id: data.bookId, organizationId },
    });

    if (!book) {
      throw new BadRequestException(`Book with ID ${data.bookId} not found`);
    }

    if (book.salePrice === null) {
      throw new BadRequestException('This book is not available for purchase');
    }

    await this.assertBookHasCopies(organizationId, data.bookId);

    const cart = await this.getOrCreateCart(organizationId, memberId);

    await this.prisma.cartItem.create({
      data: {
        organizationId,
        cartId: cart.id,
        bookId: data.bookId,
        preferredCondition: data.preferredCondition,
      },
    });

    return this.getCart(organizationId, memberId);
  }

  /**
   * Remove a single line item from the patron's cart
   */
  async removeItem(
    organizationId: string,
    memberId: string,
    itemId: string,
  ): Promise<CartResponse> {
    const cart = await this.getOrCreateCart(organizationId, memberId);

    const { count } = await this.prisma.cartItem.deleteMany({
      where: { id: itemId, organizationId, cartId: cart.id },
    });

    if (count === 0) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found`);
    }

    return this.getCart(organizationId, memberId);
  }

  /**
   * Mock checkout with a real inventory effect: claims one AVAILABLE copy
   * per line item (matching its preferred condition, if set), marks each
   * SOLD, and records a Purchase. Every item must be fulfillable or the
   * whole checkout fails and nothing commits - collecting every failure
   * first (rather than throwing on the first) so the error names every
   * unfulfillable book, not just one.
   */
  async checkout(
    organizationId: string,
    memberId: string,
  ): Promise<CheckoutResponse> {
    const cart = await this.getOrCreateCart(organizationId, memberId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    const purchases = await this.prisma.$transaction(async (tx) => {
      const failures: string[] = [];
      const created: PurchaseWithBookCopy[] = [];

      for (const item of cart.items) {
        if (item.book.salePrice === null) {
          failures.push(item.book.title);
          continue;
        }

        const copy = await this.claimAvailableCopy(tx, organizationId, item);

        if (!copy) {
          failures.push(item.book.title);
          continue;
        }

        const purchase = await tx.purchase.create({
          data: {
            organizationId,
            bookCopyId: copy.id,
            memberId,
            price: item.book.salePrice,
          },
          include: purchaseInclude,
        });

        created.push(purchase);
      }

      if (failures.length > 0) {
        throw new ConflictException(
          `The following books are no longer available for purchase: ${failures.join(', ')}`,
        );
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    const total = purchases
      .reduce((sum, purchase) => sum + Number(purchase.price), 0)
      .toFixed(2);

    return {
      purchases: purchases.map((purchase) => ({
        ...purchase,
        price: purchase.price.toString(),
      })),
      total,
    };
  }

  // Conditional updateMany guarded by the expected current status doubles as
  // both the tenant-safety check and the concurrency guard - if another
  // checkout claims the same copy first, this simply returns null instead of
  // racing (Postgres re-evaluates WHERE after the other transaction's lock
  // releases), and the caller records it as an unfulfillable item.
  private async claimAvailableCopy(
    tx: Prisma.TransactionClient,
    organizationId: string,
    item: { bookId: string; preferredCondition: BookCopyCondition | null },
  ) {
    const candidate = await tx.bookCopy.findFirst({
      where: {
        organizationId,
        bookId: item.bookId,
        status: 'AVAILABLE',
        condition: item.preferredCondition ?? undefined,
      },
    });

    if (!candidate) {
      return null;
    }

    const { count } = await tx.bookCopy.updateMany({
      where: { id: candidate.id, status: 'AVAILABLE' },
      data: { status: 'SOLD' },
    });

    return count === 1 ? candidate : null;
  }

  private async getOrCreateCart(
    organizationId: string,
    memberId: string,
  ): Promise<CartWithItems> {
    return this.prisma.cart.upsert({
      where: { memberId },
      create: { organizationId, memberId },
      update: {},
      include: cartInclude,
    });
  }

  // Mirrors ReservationsService's same-named guard: a book with zero copies
  // ever added can't be reserved OR bought - both are checked independently
  // per-service rather than through a shared cross-module helper, matching
  // this codebase's existing convention of small per-service validators.
  private async assertBookHasCopies(
    organizationId: string,
    bookId: string,
  ): Promise<void> {
    const count = await this.prisma.bookCopy.count({
      where: { organizationId, bookId },
    });

    if (count === 0) {
      throw new BadRequestException(
        'This book has no copies in this library yet',
      );
    }
  }

  private toResponse(cart: CartWithItems): CartResponse {
    return {
      ...cart,
      items: cart.items.map((item) => ({
        ...item,
        book: {
          ...item.book,
          salePrice: item.book.salePrice?.toString() ?? null,
        },
      })),
    };
  }
}
