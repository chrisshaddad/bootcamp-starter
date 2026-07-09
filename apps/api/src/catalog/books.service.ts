import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type {
  BookResponse,
  BookListResponse,
  BookCreateRequest,
  BookUpdateRequest,
} from '@repo/contracts';

const bookInclude = {
  publisher: { select: { id: true, name: true } },
  authors: { include: { author: { select: { id: true, name: true } } } },
  categories: { include: { category: { select: { id: true, name: true } } } },
} satisfies Prisma.BookInclude;

type BookWithRelations = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List books for an organization
   */
  async findAll(
    organizationId: string,
    options: { page?: number; limit?: number },
  ): Promise<BookListResponse> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where: { organizationId },
        skip,
        take: limit,
        orderBy: { title: 'asc' },
        include: bookInclude,
      }),
      this.prisma.book.count({ where: { organizationId } }),
    ]);

    return { books: books.map((book) => this.toResponse(book)), total };
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

    return this.toResponse(book);
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

    const { authorIds, categoryIds, ...bookFields } = data;

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
    });

    return this.findOne(organizationId, id);
  }

  private toResponse(book: BookWithRelations): BookResponse {
    return {
      ...book,
      salePrice: book.salePrice?.toString() ?? null,
      authors: book.authors.map(({ author }) => author),
      categories: book.categories.map(({ category }) => category),
    };
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
}
