import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type {
  BookCopyResponse,
  BookCopyListResponse,
  BookCopyCreateRequest,
  BookCopyUpdateRequest,
  BookCopyStatus,
} from '@repo/contracts';

const bookCopyInclude = {
  book: { select: { id: true, title: true } },
} satisfies Prisma.BookCopyInclude;

@Injectable()
export class BookCopiesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List book copies for an organization, optionally filtered by book or status
   */
  async findAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      bookId?: string;
      status?: BookCopyStatus;
    },
  ): Promise<BookCopyListResponse> {
    const { page = 1, limit = 20, bookId, status } = options;
    const skip = (page - 1) * limit;
    const where = { organizationId, bookId, status };

    const [bookCopies, total] = await Promise.all([
      this.prisma.bookCopy.findMany({
        where,
        skip,
        take: limit,
        orderBy: { barcode: 'asc' },
        include: bookCopyInclude,
      }),
      this.prisma.bookCopy.count({ where }),
    ]);

    return { bookCopies, total };
  }

  /**
   * Get a single book copy, scoped to the organization
   */
  async findOne(organizationId: string, id: string): Promise<BookCopyResponse> {
    const bookCopy = await this.prisma.bookCopy.findFirst({
      where: { id, organizationId },
      include: bookCopyInclude,
    });

    if (!bookCopy) {
      throw new NotFoundException(`Book copy with ID ${id} not found`);
    }

    return bookCopy;
  }

  /**
   * Create a book copy within the organization
   */
  async create(
    organizationId: string,
    data: BookCopyCreateRequest,
  ): Promise<BookCopyResponse> {
    await this.validateBook(organizationId, data.bookId);

    try {
      const bookCopy = await this.prisma.bookCopy.create({
        data: { ...data, organizationId },
        include: bookCopyInclude,
      });

      return bookCopy;
    } catch (error) {
      throw this.mapDuplicateBarcodeError(error, data.barcode);
    }
  }

  /**
   * Update a book copy, scoped to the organization
   */
  async update(
    organizationId: string,
    id: string,
    data: BookCopyUpdateRequest,
  ): Promise<BookCopyResponse> {
    const existing = await this.prisma.bookCopy.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Book copy with ID ${id} not found`);
    }

    try {
      const bookCopy = await this.prisma.bookCopy.update({
        where: { id },
        data,
        include: bookCopyInclude,
      });

      return bookCopy;
    } catch (error) {
      throw this.mapDuplicateBarcodeError(
        error,
        data.barcode ?? existing.barcode,
      );
    }
  }

  // bookId is a globally-unique UUID, so the FK insert would succeed even if
  // it pointed at another organization's book. Verify tenancy explicitly,
  // same reasoning as BooksService.validateRelatedEntities.
  private async validateBook(
    organizationId: string,
    bookId: string,
  ): Promise<void> {
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, organizationId },
    });

    if (!book) {
      throw new BadRequestException(`Book with ID ${bookId} not found`);
    }
  }

  private mapDuplicateBarcodeError(error: unknown, barcode: string): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException(
        `A book copy with barcode "${barcode}" already exists`,
      );
    }

    return error as Error;
  }
}
