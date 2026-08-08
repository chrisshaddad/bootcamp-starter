import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type BookCopyCondition } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type {
  BookResponse,
  BookListResponse,
  BookCreateRequest,
  BookUpdateRequest,
  BookStockRow,
} from '@repo/contracts';

const CONDITION_ORDER: BookCopyCondition[] = [
  'NEW',
  'GOOD',
  'FAIR',
  'POOR',
  'DAMAGED',
];

type StockByConditionMap = Record<BookCopyCondition, number>;

function emptyStockByCondition(): StockByConditionMap {
  return Object.fromEntries(
    CONDITION_ORDER.map((condition) => [condition, 0]),
  ) as StockByConditionMap;
}

function stockRowsToMap(rows: BookStockRow[]): StockByConditionMap {
  const stock = emptyStockByCondition();

  for (const row of rows) {
    stock[row.condition] = row.quantity;
  }

  return stock;
}

const bookInclude = {
  publisher: { select: { id: true, name: true } },
  authors: { include: { author: { select: { id: true, name: true } } } },
  categories: { include: { category: { select: { id: true, name: true } } } },
  conditionPrices: {
    select: { id: true, condition: true, buyPrice: true },
  },
  _count: { select: { copies: { where: { status: 'AVAILABLE' } } } },
} satisfies Prisma.BookInclude;

type BookWithRelations = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List books for an organization, optionally filtered by title search,
   * category, or author - all applied server-side so filtering covers the
   * full catalog, not just whichever page happened to load.
   */
  async findAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      categoryId?: string;
      authorId?: string;
    },
  ): Promise<BookListResponse> {
    const { page = 1, limit = 20, search, categoryId, authorId } = options;
    const skip = (page - 1) * limit;
    const trimmedSearch = search?.trim();

    const where: Prisma.BookWhereInput = {
      organizationId,
      ...(trimmedSearch
        ? {
            OR: [
              { title: { contains: trimmedSearch, mode: 'insensitive' } },
              { isbn: { contains: trimmedSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
      ...(authorId ? { authors: { some: { authorId } } } : {}),
    };

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        skip,
        take: limit,
        orderBy: { title: 'asc' },
        include: bookInclude,
      }),
      this.prisma.book.count({ where }),
    ]);

    const stockByBookId = await this.loadAvailableStockByCondition(
      organizationId,
      books.map((book) => book.id),
    );

    return {
      books: books.map((book) =>
        this.toResponse(book, stockByBookId.get(book.id)),
      ),
      total,
    };
  }

  /**
   * Get a single book, scoped to the organization
   */
  async findOne(organizationId: string, id: string): Promise<BookResponse> {
    const book = await this.prisma.book.findFirst({
      where: { id, organizationId },
      include: bookInclude,
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    const stockByBookId = await this.loadAvailableStockByCondition(
      organizationId,
      [book.id],
    );

    return this.toResponse(book, stockByBookId.get(book.id));
  }

  /**
   * Create a book within the organization, linking authors/categories
   */
  async create(
    organizationId: string,
    data: BookCreateRequest,
  ): Promise<BookResponse> {
    const {
      authorIds: rawAuthorIds = [],
      categoryIds: rawCategoryIds = [],
      conditionPrices = [],
      stockByCondition,
      addCopies = [],
      ...bookFields
    } = data;

    const authorIds = [...new Set(rawAuthorIds)];
    const categoryIds = [...new Set(rawCategoryIds)];

    await this.validateRelatedEntities(organizationId, {
      publisherId: bookFields.publisherId,
      authorIds,
      categoryIds,
    });

    const bookId = await this.prisma.$transaction(async (tx) => {
      const book = await tx.book.create({
        data: { ...bookFields, organizationId },
      });

      if (authorIds.length > 0) {
        await tx.bookAuthor.createMany({
          data: authorIds.map((authorId) => ({
            organizationId,
            bookId: book.id,
            authorId,
          })),
        });
      }

      if (categoryIds.length > 0) {
        await tx.bookCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            organizationId,
            bookId: book.id,
            categoryId,
          })),
        });
      }

      if (conditionPrices.length > 0) {
        await tx.bookConditionPrice.createMany({
          data: conditionPrices.map((cp) => ({
            organizationId,
            bookId: book.id,
            condition: cp.condition,
            buyPrice: cp.buyPrice,
          })),
        });
      }

      if (stockByCondition !== undefined) {
        await this.setBookStock(tx, organizationId, book.id, stockByCondition);
      } else {
        await this.addBookCopies(tx, organizationId, book.id, addCopies);
      }

      return book.id;
    });

    return this.findOne(organizationId, bookId);
  }

  /**
   * Update a book, scoped to the organization. authorIds/categoryIds, when
   * provided, fully replace the existing associations; when omitted, the
   * existing associations are left untouched.
   */
  async update(
    organizationId: string,
    id: string,
    data: BookUpdateRequest,
  ): Promise<BookResponse> {
    const existing = await this.prisma.book.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    const {
      authorIds,
      categoryIds,
      conditionPrices,
      stockByCondition,
      addCopies,
      ...bookFields
    } = data;

    await this.validateRelatedEntities(organizationId, {
      publisherId: bookFields.publisherId,
      authorIds,
      categoryIds,
    });

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.book.updateMany({
        where: { id, organizationId },
        data: bookFields,
      });

      if (count === 0) {
        throw new NotFoundException(`Book with ID ${id} not found`);
      }

      if (authorIds !== undefined) {
        await tx.bookAuthor.deleteMany({ where: { bookId: id } });

        if (authorIds.length > 0) {
          await tx.bookAuthor.createMany({
            data: authorIds.map((authorId) => ({
              organizationId,
              bookId: id,
              authorId,
            })),
          });
        }
      }

      if (categoryIds !== undefined) {
        await tx.bookCategory.deleteMany({ where: { bookId: id } });

        if (categoryIds.length > 0) {
          await tx.bookCategory.createMany({
            data: categoryIds.map((categoryId) => ({
              organizationId,
              bookId: id,
              categoryId,
            })),
          });
        }
      }

      if (conditionPrices !== undefined) {
        await tx.bookConditionPrice.deleteMany({ where: { bookId: id } });

        if (conditionPrices.length > 0) {
          await tx.bookConditionPrice.createMany({
            data: conditionPrices.map((cp) => ({
              organizationId,
              bookId: id,
              condition: cp.condition,
              buyPrice: cp.buyPrice,
            })),
          });
        }
      }

      if (stockByCondition !== undefined) {
        await this.setBookStock(tx, organizationId, id, stockByCondition);
      } else if (addCopies !== undefined) {
        await this.addBookCopies(tx, organizationId, id, addCopies);
      }
    });

    return this.findOne(organizationId, id);
  }

  /**
   * Delete a book, scoped to the organization. Blocked (409) while it still
   * has copies in inventory or open reservations, so deleting never silently
   * cascades away physical copies / member holds. The BookAuthor/BookCategory
   * join rows cascade at the DB level once those blockers are clear.
   */
  async remove(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.book.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }

    const copies = await this.prisma.bookCopy.count({
      where: { bookId: id, organizationId },
    });

    if (copies > 0) {
      throw new ConflictException(
        `Cannot delete "${existing.title}" — it still has ${copies} copy/copies in inventory.`,
      );
    }

    const openReservations = await this.prisma.reservation.count({
      where: {
        bookId: id,
        organizationId,
        status: { in: ['ACTIVE', 'READY_FOR_PICKUP'] },
      },
    });

    if (openReservations > 0) {
      throw new ConflictException(
        `Cannot delete "${existing.title}" — it has ${openReservations} open reservation(s).`,
      );
    }

    await this.prisma.book.delete({ where: { id } });
  }

  private toResponse(
    book: BookWithRelations,
    stockByCondition?: StockByConditionMap,
  ): BookResponse {
    const { _count, ...rest } = book;
    const stock = stockByCondition ?? emptyStockByCondition();

    return {
      ...rest,
      conditionPrices: book.conditionPrices.map((cp) => ({
        id: cp.id,
        condition: cp.condition,
        buyPrice: cp.buyPrice.toString(),
      })),
      authors: book.authors.map(({ author }) => author),
      categories: book.categories.map(({ category }) => category),
      availableCopies: _count.copies,
      stockByCondition: CONDITION_ORDER.map((condition) => ({
        condition,
        quantity: stock[condition],
      })),
    };
  }

  private async loadAvailableStockByCondition(
    organizationId: string,
    bookIds: string[],
  ): Promise<Map<string, StockByConditionMap>> {
    const stockByBookId = new Map<string, StockByConditionMap>();

    if (bookIds.length === 0) {
      return stockByBookId;
    }

    for (const bookId of bookIds) {
      stockByBookId.set(bookId, emptyStockByCondition());
    }

    const grouped = await this.prisma.bookCopy.groupBy({
      by: ['bookId', 'condition'],
      where: {
        organizationId,
        bookId: { in: bookIds },
        status: 'AVAILABLE',
      },
      _count: { _all: true },
    });

    for (const row of grouped) {
      const stock = stockByBookId.get(row.bookId);
      if (!stock) continue;
      stock[row.condition] = row._count._all;
    }

    return stockByBookId;
  }

  private async setBookStock(
    tx: Prisma.TransactionClient,
    organizationId: string,
    bookId: string,
    stockByCondition: NonNullable<BookCreateRequest['stockByCondition']>,
  ): Promise<void> {
    const target = stockRowsToMap(stockByCondition);
    const currentCopies = await tx.bookCopy.findMany({
      where: {
        organizationId,
        bookId,
        status: 'AVAILABLE',
      },
      select: { id: true, condition: true },
    });

    const current = emptyStockByCondition();
    for (const copy of currentCopies) {
      current[copy.condition] += 1;
    }

    for (const condition of CONDITION_ORDER) {
      const desired = target[condition];
      const existing = current[condition];

      if (desired < existing) {
        const removable = await tx.bookCopy.findMany({
          where: {
            organizationId,
            bookId,
            condition,
            status: 'AVAILABLE',
            rentals: { none: {} },
            purchases: { none: {} },
          },
          select: { id: true },
          orderBy: { createdAt: 'asc' },
          take: existing - desired,
        });

        if (removable.length < existing - desired) {
          throw new ConflictException(
            `Cannot reduce ${condition} stock below copies that already have rental or purchase history`,
          );
        }

        await tx.bookCopy.deleteMany({
          where: { id: { in: removable.map((copy) => copy.id) } },
        });
      } else if (desired > existing) {
        await this.addBookCopies(tx, organizationId, bookId, [
          { condition, quantity: desired - existing },
        ]);
      }
    }
  }

  // A publisherId/authorId/categoryId is a globally-unique UUID, so a
  // foreign-key insert succeeds even if it points at another organization's
  // row — Prisma has no way to know it should be tenant-scoped. Verify each
  // reference belongs to this organization before it's ever linked to a book.
  private async validateRelatedEntities(
    organizationId: string,
    refs: {
      publisherId?: string;
      authorIds?: string[];
      categoryIds?: string[];
    },
  ): Promise<void> {
    if (refs.publisherId) {
      const publisher = await this.prisma.publisher.findFirst({
        where: { id: refs.publisherId, organizationId },
      });

      if (!publisher) {
        throw new BadRequestException(
          `Publisher with ID ${refs.publisherId} not found`,
        );
      }
    }

    if (refs.authorIds && refs.authorIds.length > 0) {
      const count = await this.prisma.author.count({
        where: { id: { in: refs.authorIds }, organizationId },
      });

      if (count !== refs.authorIds.length) {
        throw new BadRequestException(
          'One or more authors were not found in this organization',
        );
      }
    }

    if (refs.categoryIds && refs.categoryIds.length > 0) {
      const count = await this.prisma.category.count({
        where: { id: { in: refs.categoryIds }, organizationId },
      });

      if (count !== refs.categoryIds.length) {
        throw new BadRequestException(
          'One or more categories were not found in this organization',
        );
      }
    }
  }

  // Adds N new copies per condition to a book (create or update - always
  // additive, never removes/replaces existing copies). Barcodes are
  // auto-generated.
  private async addBookCopies(
    tx: Prisma.TransactionClient,
    organizationId: string,
    bookId: string,
    addCopies: NonNullable<BookCreateRequest['addCopies']>,
  ): Promise<void> {
    const total = addCopies.reduce((sum, row) => sum + row.quantity, 0);
    if (total === 0) return;

    const barcodes = await this.generateBarcodes(tx, organizationId, total);

    let cursor = 0;
    await tx.bookCopy.createMany({
      data: addCopies.flatMap((row) =>
        Array.from({ length: row.quantity }, () => ({
          organizationId,
          bookId,
          barcode: barcodes[cursor++]!,
          condition: row.condition,
        })),
      ),
    });
  }

  // Auto-issue barcodes for a book's initial copies, same prefix+sequence
  // convention as LibraryMembersService.generateCardNumber(). Runs inside
  // the caller's transaction so in-flight (uncommitted) barcodes from this
  // same request are already visible and can't collide with each other.
  private async generateBarcodes(
    tx: Prisma.TransactionClient,
    organizationId: string,
    count: number,
  ): Promise<string[]> {
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    });

    const prefix =
      org?.slug
        .split('-')
        .map((part) => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 3) || 'LIB';

    const existingCount = await tx.bookCopy.count({
      where: { organizationId },
    });

    const barcodes: string[] = [];
    let seq = existingCount + 1;

    // Bounded search with a per-barcode retry budget; any slots still unfilled
    // after that (pathological amounts of collisions) fall back to a
    // timestamp suffix, which guarantees termination and uniqueness.
    for (
      let attempts = 0;
      barcodes.length < count && attempts < count * 20 + 100;
      attempts++
    ) {
      const candidate = `${prefix}-${String(seq).padStart(6, '0')}`;
      const existing = await tx.bookCopy.findFirst({
        where: { organizationId, barcode: candidate },
        select: { id: true },
      });

      if (!existing) {
        barcodes.push(candidate);
      }
      seq++;
    }

    while (barcodes.length < count) {
      barcodes.push(`${prefix}-${Date.now()}-${barcodes.length}`);
    }

    return barcodes;
  }
}
