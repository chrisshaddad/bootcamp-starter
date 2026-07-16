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
  LibraryMemberWithOrganizationResponse,
  LibraryMemberWithOrganizationListResponse,
  PortalMembershipRequest,
} from '@repo/contracts';

const libraryMemberInclude = {
  user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.LibraryMemberInclude;

const libraryMemberWithOrganizationInclude = {
  user: { select: { id: true, email: true, name: true } },
  organization: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.LibraryMemberInclude;

const CARD_NUMBER_GENERATION_ATTEMPTS = 5;

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
   * A patron's own membership within a specific (already-active) organization
   * - used by the portal controllers to resolve "who is this patron here".
   */
  async findByUser(
    organizationId: string,
    userId: string,
  ): Promise<LibraryMemberResponse> {
    const libraryMember = await this.prisma.libraryMember.findFirst({
      where: { organizationId, userId },
      include: libraryMemberInclude,
    });

    if (!libraryMember) {
      throw new NotFoundException('No membership found for this library');
    }

    return libraryMember;
  }

  /**
   * A patron requesting access to a specific library. userId is always the
   * caller's own id (from the session) - never client-supplied. The request
   * starts PENDING; a SUPER_ADMIN reviews it (see approve()/reject() below),
   * not that library's own staff.
   */
  async requestMembership(
    userId: string,
    dto: PortalMembershipRequest,
  ): Promise<LibraryMemberWithOrganizationResponse> {
    const organization = await this.prisma.organization.findUnique({
      where: { slug: dto.organizationSlug },
    });

    if (!organization || organization.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Library "${dto.organizationSlug}" was not found`,
      );
    }

    const existing = await this.prisma.libraryMember.findFirst({
      where: { organizationId: organization.id, userId },
    });

    if (existing) {
      throw new ConflictException(
        'You already have a membership request (or membership) for this library',
      );
    }

    for (
      let attempt = 0;
      attempt < CARD_NUMBER_GENERATION_ATTEMPTS;
      attempt++
    ) {
      try {
        return await this.prisma.libraryMember.create({
          data: {
            organizationId: organization.id,
            userId,
            libraryCardNumber: this.generateSelfServiceCardNumber(
              organization.slug,
            ),
            membershipType: dto.membershipType,
            membershipStatus: 'PENDING',
          },
          include: libraryMemberWithOrganizationInclude,
        });
      } catch (error) {
        const isCardNumberConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          this.extractConflictingFields(error).includes('libraryCardNumber');

        if (!isCardNumberConflict) {
          throw error;
        }
        // else: retry with a freshly generated card number
      }
    }

    throw new ConflictException(
      'Could not generate a unique library card number, please try again',
    );
  }

  /**
   * A patron's own membership requests/memberships across every library -
   * intentionally not organizationId-scoped, since it's "my own records only".
   */
  async findMyMemberships(
    userId: string,
  ): Promise<LibraryMemberWithOrganizationListResponse> {
    const libraryMembers = await this.prisma.libraryMember.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: libraryMemberWithOrganizationInclude,
    });

    return { libraryMembers, total: libraryMembers.length };
  }

  /**
   * Platform-wide pending membership requests, across every organization -
   * SUPER_ADMIN reviews these, not each library's own staff (mirrors how
   * Organization registrations are approved today).
   */
  async findAllPending(options: {
    page?: number;
    limit?: number;
  }): Promise<LibraryMemberWithOrganizationListResponse> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;
    const where = { membershipStatus: 'PENDING' as const };

    const [libraryMembers, total] = await Promise.all([
      this.prisma.libraryMember.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: libraryMemberWithOrganizationInclude,
      }),
      this.prisma.libraryMember.count({ where }),
    ]);

    return { libraryMembers, total };
  }

  /**
   * Approve a pending membership request (PENDING -> ACTIVE). Not
   * organizationId-scoped since a SUPER_ADMIN isn't tied to one org.
   */
  async approve(id: string): Promise<LibraryMemberWithOrganizationResponse> {
    const existing = await this.requirePending(id);

    return this.prisma.libraryMember.update({
      where: { id: existing.id },
      data: { membershipStatus: 'ACTIVE' },
      include: libraryMemberWithOrganizationInclude,
    });
  }

  /**
   * Reject a pending membership request (PENDING -> CANCELLED - there's no
   * REJECTED value on LibraryMemberStatus, unlike OrganizationStatus).
   */
  async reject(id: string): Promise<LibraryMemberWithOrganizationResponse> {
    const existing = await this.requirePending(id);

    return this.prisma.libraryMember.update({
      where: { id: existing.id },
      data: { membershipStatus: 'CANCELLED' },
      include: libraryMemberWithOrganizationInclude,
    });
  }

  /**
   * A patron deactivating their own membership (ACTIVE -> SUSPENDED, mirrors
   * OrganizationsService's reversible ACTIVE <-> SUSPENDED lifecycle - not
   * CANCELLED, which this codebase reserves for terminal/rejected states).
   * Scoped by userId only, not organizationId, matching findMyMemberships -
   * this is "my own membership record", and membership id already pins the
   * exact org.
   */
  async deactivate(
    id: string,
    userId: string,
  ): Promise<LibraryMemberWithOrganizationResponse> {
    const existing = await this.prisma.libraryMember.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('No membership found');
    }

    if (existing.membershipStatus !== 'ACTIVE') {
      throw new BadRequestException(
        `Only an ACTIVE membership can be deactivated (current status: ${existing.membershipStatus})`,
      );
    }

    return this.prisma.libraryMember.update({
      where: { id: existing.id },
      data: { membershipStatus: 'SUSPENDED' },
      include: libraryMemberWithOrganizationInclude,
    });
  }

  private async requirePending(id: string) {
    const existing = await this.prisma.libraryMember.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Library member with ID ${id} not found`);
    }

    if (existing.membershipStatus !== 'PENDING') {
      throw new BadRequestException(
        `Only a PENDING request can be reviewed (current status: ${existing.membershipStatus})`,
      );
    }

    return existing;
  }

  // Used only by requestMembership()'s patron self-service flow, which
  // retries on a card-number collision - unlike generateCardNumber() above
  // (staff-created members), a random suffix needs that retry loop.
  private generateSelfServiceCardNumber(slug: string): string {
    const prefix = slug.slice(0, 3).toUpperCase();
    const suffix = Math.floor(100000 + Math.random() * 900000);
    return `${prefix}-${suffix}`;
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
