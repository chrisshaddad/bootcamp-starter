import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type {
  LibraryMemberResponse,
  LibraryMemberListResponse,
  LibraryMemberCreateRequest,
  LibraryMemberUpdateRequest,
  LibraryMemberStatus,
  LibraryMembershipType,
} from '@repo/contracts';

const libraryMemberInclude = {
  user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.LibraryMemberInclude;

@Injectable()
export class LibraryMembersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List library members for an organization, optionally filtered by status or type
   */
  async findAll(
    organizationId: string,
    options: {
      page?: number;
      limit?: number;
      membershipStatus?: LibraryMemberStatus;
      membershipType?: LibraryMembershipType;
      search?: string;
    },
  ): Promise<LibraryMemberListResponse> {
    const {
      page = 1,
      limit = 20,
      membershipStatus,
      membershipType,
      search,
    } = options;
    const skip = (page - 1) * limit;
    const where: Prisma.LibraryMemberWhereInput = {
      organizationId,
      membershipStatus,
      membershipType,
      ...(search
        ? {
            OR: [
              { libraryCardNumber: { contains: search, mode: 'insensitive' } },
              { user: { name: { contains: search, mode: 'insensitive' } } },
              { user: { email: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [libraryMembers, total] = await Promise.all([
      this.prisma.libraryMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { libraryCardNumber: 'asc' },
        include: libraryMemberInclude,
      }),
      this.prisma.libraryMember.count({ where }),
    ]);

    return { libraryMembers, total };
  }

  /**
   * Get a single library member, scoped to the organization
   */
  async findOne(
    organizationId: string,
    id: string,
  ): Promise<LibraryMemberResponse> {
    const libraryMember = await this.prisma.libraryMember.findFirst({
      where: { id, organizationId },
      include: libraryMemberInclude,
    });

    if (!libraryMember) {
      throw new NotFoundException(`Library member with ID ${id} not found`);
    }

    return libraryMember;
  }

  /**
   * Create a library member within the organization
   */
  async create(
    organizationId: string,
    data: LibraryMemberCreateRequest,
  ): Promise<LibraryMemberResponse> {
    if (data.userId) {
      await this.validateMemberUser(data.userId);
    }

    const libraryCardNumber =
      data.libraryCardNumber?.trim() ||
      (await this.generateCardNumber(organizationId));

    try {
      return await this.prisma.libraryMember.create({
        data: { ...data, libraryCardNumber, organizationId },
        include: libraryMemberInclude,
      });
    } catch (error) {
      throw this.mapConflictError(error, libraryCardNumber);
    }
  }

  // Auto-issue a per-org card number when staff don't supply one. Prefix is
  // derived from the org slug's initials; the numeric suffix starts past the
  // current member count and skips any already-taken value (seeded/manual
  // cards, or gaps from deletions) so we never hand out a duplicate.
  private async generateCardNumber(organizationId: string): Promise<string> {
    const org = await this.prisma.organization.findUnique({
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

    const count = await this.prisma.libraryMember.count({
      where: { organizationId },
    });

    let seq = count + 1;
    for (let attempts = 0; attempts < 100; attempts++) {
      const candidate = `${prefix}-${String(seq).padStart(4, '0')}`;
      const existing = await this.prisma.libraryMember.findFirst({
        where: { organizationId, libraryCardNumber: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }

      seq++;
    }

    // Extremely unlikely fallback: guarantee uniqueness with a timestamp.
    return `${prefix}-${Date.now()}`;
  }

  /**
   * Update a library member, scoped to the organization
   */
  async update(
    organizationId: string,
    id: string,
    data: LibraryMemberUpdateRequest,
  ): Promise<LibraryMemberResponse> {
    const existing = await this.prisma.libraryMember.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Library member with ID ${id} not found`);
    }

    if (data.userId) {
      await this.validateMemberUser(data.userId);
    }

    try {
      return await this.prisma.libraryMember.update({
        where: { id },
        data,
        include: libraryMemberInclude,
      });
    } catch (error) {
      throw this.mapConflictError(
        error,
        data.libraryCardNumber ?? existing.libraryCardNumber,
      );
    }
  }

  /**
   * Delete a library member, scoped to the organization. Blocked (409) while
   * any rental references them — the Rental→member FK is onDelete: Restrict,
   * so the DB would reject it anyway; this returns a friendly message first.
   * (Reservations cascade, so they don't block.)
   */
  async remove(organizationId: string, id: string): Promise<void> {
    const existing = await this.prisma.libraryMember.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Library member with ID ${id} not found`);
    }

    const rentals = await this.prisma.rental.count({
      where: { memberId: id, organizationId },
    });

    if (rentals > 0) {
      throw new ConflictException(
        `Cannot delete member "${existing.libraryCardNumber}" — they have ${rentals} rental record(s).`,
      );
    }

    await this.prisma.libraryMember.delete({ where: { id } });
  }

  // User.organizationId is null for MEMBER-role users (their org affiliation
  // lives entirely in LibraryMember rows, per the schema's own comment), so
  // this is a plain id lookup rather than the usual { id, organizationId }
  // tenant-scoped pattern - there's no organizationId on User to scope by.
  private async validateMemberUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException(`User with ID ${userId} not found`);
    }

    if (user.role !== 'MEMBER') {
      throw new BadRequestException(
        'Only MEMBER-role users can be linked to a library membership',
      );
    }
  }

  // Two separate unique constraints share the P2002 code:
  // (organizationId, libraryCardNumber) and (organizationId, userId).
  private mapConflictError(error: unknown, libraryCardNumber: string): Error {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const fields = this.extractConflictingFields(error);

      if (fields.includes('userId')) {
        return new ConflictException(
          'This user is already a member of this library',
        );
      }

      if (fields.includes('libraryCardNumber')) {
        return new ConflictException(
          `A member with library card number "${libraryCardNumber}" already exists`,
        );
      }

      return new ConflictException('This library member already exists');
    }

    return error as Error;
  }

  // The documented `error.meta.target` array isn't populated by this
  // Prisma version's driver-adapter (@prisma/adapter-pg) query engine -
  // verified directly against this project's client. The actual column
  // names live nested under meta.driverAdapterError.cause.constraint.fields,
  // each wrapped in literal double-quote characters (e.g. '"userId"').
  // Falls back to meta.target in case a future engine upgrade restores it.
  private extractConflictingFields(
    error: Prisma.PrismaClientKnownRequestError,
  ): string[] {
    const meta = error.meta;
    const nestedFields = (
      meta?.driverAdapterError as
        | { cause?: { constraint?: { fields?: string[] } } }
        | undefined
    )?.cause?.constraint?.fields;

    if (Array.isArray(nestedFields)) {
      return nestedFields.map((field) => field.replaceAll('"', ''));
    }

    const target = meta?.target;
    return Array.isArray(target)
      ? target.filter((field): field is string => typeof field === 'string')
      : [];
  }
}
