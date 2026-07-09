import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@repo/db';
import type {
  BranchCreateRequest,
  BranchResponse,
  BranchUpdateRequest,
  PharmacyAdminListResponse,
  PharmacyCreateRequest,
  PharmacyDetailResponse,
  PharmacyListResponse,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';

// Columns that make up a `BranchResponse` (minus the derived `userCount`).
const BRANCH_SELECT = {
  id: true,
  pharmacyId: true,
  name: true,
  phoneNumber: true,
  address: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  _count: { select: { users: true } },
} satisfies Prisma.PharmacyBranchSelect;

type BranchRow = Prisma.PharmacyBranchGetPayload<{
  select: typeof BRANCH_SELECT;
}>;

@Injectable()
export class PharmaciesService {
  private readonly logger = new Logger(PharmaciesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** All pharmacies, for selection dropdowns. Always reflects live data. */
  async list(): Promise<PharmacyListResponse> {
    const pharmacies = await this.prisma.pharmacy.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return { pharmacies };
  }

  /**
   * Rich pharmacy listing for the super-admin console. Carries live rollup
   * counts: branches, pharmacy admins, and total linked users. Restricted to
   * SUPER_ADMIN at the controller — this is a whole-platform, cross-tenant view.
   */
  async adminList(): Promise<PharmacyAdminListResponse> {
    const pharmacies = await this.prisma.pharmacy.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            branches: true,
            users: true,
          },
        },
        // Admin count needs its own filtered relation count; `_count` can't
        // filter, so count PHARMACY_ADMIN users per pharmacy separately.
        users: {
          where: { role: 'PHARMACY_ADMIN' },
          select: { id: true },
        },
      },
    });

    return {
      total: pharmacies.length,
      pharmacies: pharmacies.map((pharmacy) => ({
        id: pharmacy.id,
        name: pharmacy.name,
        createdAt: pharmacy.createdAt,
        branchCount: pharmacy._count.branches,
        userCount: pharmacy._count.users,
        adminCount: pharmacy.users.length,
      })),
    };
  }

  /**
   * One pharmacy with its branches and users (admins included) for the detail
   * page. Cross-tenant on purpose — the caller is SUPER_ADMIN.
   */
  async detail(id: string): Promise<PharmacyDetailResponse> {
    return this.buildDetail(id);
  }

  /**
   * Register a pharmacy and invite its first admin in one atomic step: creates
   * the pharmacy plus a PENDING PHARMACY_ADMIN user scoped to it. The admin has
   * no password — they onboard through the magic-link / set-password flow, same
   * as every other invited staff account. An optional first branch is created
   * in the same transaction (not every pharmacy opens with a branch).
   */
  async create(dto: PharmacyCreateRequest): Promise<PharmacyAdminListResponse> {
    const email = dto.adminEmail.toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      throw new ConflictException(
        'A user with this admin email already exists.',
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const pharmacy = await tx.pharmacy.create({
          data: { name: dto.name },
          select: { id: true },
        });
        await tx.user.create({
          data: {
            firstName: dto.adminFirstName,
            lastName: dto.adminLastName,
            email,
            role: 'PHARMACY_ADMIN',
            status: 'PENDING',
            pharmacyId: pharmacy.id,
            branchId: null,
            password: null,
          },
        });
        if (dto.branch) {
          await tx.pharmacyBranch.create({
            data: this.branchCreateData(pharmacy.id, dto.branch),
          });
        }
      });
    } catch (error) {
      // Unique-constraint hits: pharmacy name (P2002 on `name`) or a racing
      // user insert for the same email. Map both to a clean 409.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const target = (error.meta?.target as string[] | undefined) ?? [];
        if (target.includes('email')) {
          throw new ConflictException(
            'A user with this admin email already exists.',
          );
        }
        throw new ConflictException(
          'A pharmacy with this name already exists.',
        );
      }
      throw error;
    }

    // Return the refreshed list so the client can update in one round-trip.
    return this.adminList();
  }

  /**
   * Delete a pharmacy. Blocked while any user still belongs to it — the caller
   * removes or reassigns its staff (admin included) first. Once it has no users,
   * deleting cascades to its branches, inquiries, and stock at the DB level.
   */
  async remove(id: string): Promise<PharmacyAdminListResponse> {
    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: { id },
      select: { id: true, _count: { select: { users: true } } },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found.');
    }
    if (pharmacy._count.users > 0) {
      throw new ConflictException(
        'Remove or reassign this pharmacy’s users before deleting it.',
      );
    }

    await this.prisma.pharmacy.delete({ where: { id } });
    return this.adminList();
  }

  /** Add a branch to a pharmacy. Returns the refreshed detail. */
  async addBranch(
    pharmacyId: string,
    dto: BranchCreateRequest,
  ): Promise<PharmacyDetailResponse> {
    await this.ensurePharmacy(pharmacyId);
    await this.prisma.pharmacyBranch.create({
      data: this.branchCreateData(pharmacyId, dto),
    });
    return this.buildDetail(pharmacyId);
  }

  /** Edit a branch. Verifies the branch belongs to the pharmacy first. */
  async updateBranch(
    pharmacyId: string,
    branchId: string,
    dto: BranchUpdateRequest,
  ): Promise<PharmacyDetailResponse> {
    await this.ensureBranch(pharmacyId, branchId);

    const data: Prisma.PharmacyBranchUncheckedUpdateManyInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.latitude !== undefined) data.latitude = dto.latitude;
    if (dto.longitude !== undefined) data.longitude = dto.longitude;

    // Scope the write by pharmacyId too, so the tenant boundary is enforced on
    // the mutation itself — not just the ensureBranch pre-check above.
    await this.prisma.pharmacyBranch.updateMany({
      where: { id: branchId, pharmacyId },
      data,
    });
    return this.buildDetail(pharmacyId);
  }

  /**
   * Delete a branch. Blocked while any user is still assigned to it — the caller
   * reassigns those staff first (User → Branch is Restrict at the DB anyway).
   */
  async removeBranch(
    pharmacyId: string,
    branchId: string,
  ): Promise<PharmacyDetailResponse> {
    const branch = await this.prisma.pharmacyBranch.findFirst({
      where: { id: branchId, pharmacyId },
      select: { id: true, _count: { select: { users: true } } },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }
    if (branch._count.users > 0) {
      throw new ConflictException(
        'Reassign this branch’s users before deleting it.',
      );
    }

    // Scope the delete by pharmacyId too, keeping the tenant boundary on the
    // write itself (not just the findFirst check above).
    await this.prisma.pharmacyBranch.deleteMany({
      where: { id: branchId, pharmacyId },
    });
    return this.buildDetail(pharmacyId);
  }

  /**
   * Assign a pharmacy's user to one of its branches (or clear the assignment
   * with `null`). Both the user and the target branch must belong to the
   * pharmacy — this is the tenant boundary, so it's checked here rather than
   * trusting the ids from the request.
   */
  async assignUserBranch(
    pharmacyId: string,
    userId: string,
    branchId: string | null,
  ): Promise<PharmacyDetailResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, pharmacyId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found in this pharmacy.');
    }

    if (branchId) {
      const branch = await this.prisma.pharmacyBranch.findFirst({
        where: { id: branchId, pharmacyId },
        select: { id: true },
      });
      if (!branch) {
        throw new BadRequestException(
          'Selected branch does not belong to this pharmacy.',
        );
      }
    }

    // Scope the write by pharmacyId too, so the tenant boundary is enforced on
    // the mutation itself (not just the findFirst check above).
    await this.prisma.user.updateMany({
      where: { id: userId, pharmacyId },
      data: { branchId },
    });
    return this.buildDetail(pharmacyId);
  }

  // -------------------------------------------------------------------------

  /** Shared Prisma insert payload for a branch under a pharmacy. */
  private branchCreateData(
    pharmacyId: string,
    dto: BranchCreateRequest,
  ): Prisma.PharmacyBranchUncheckedCreateInput {
    return {
      pharmacyId,
      name: dto.name,
      phoneNumber: dto.phoneNumber ?? null,
      address: dto.address,
      latitude: dto.latitude,
      longitude: dto.longitude,
    };
  }

  /** Map a DB branch row to its wire shape (decimals → plain numbers). */
  private toBranchResponse(branch: BranchRow): BranchResponse {
    return {
      id: branch.id,
      pharmacyId: branch.pharmacyId,
      name: branch.name,
      phoneNumber: branch.phoneNumber,
      address: branch.address,
      latitude: Number(branch.latitude),
      longitude: Number(branch.longitude),
      userCount: branch._count.users,
      createdAt: branch.createdAt,
    };
  }

  /** Throw 404 unless the pharmacy exists. */
  private async ensurePharmacy(id: string): Promise<void> {
    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found.');
    }
  }

  /** Throw 404 unless the branch exists and belongs to the pharmacy. */
  private async ensureBranch(
    pharmacyId: string,
    branchId: string,
  ): Promise<void> {
    const branch = await this.prisma.pharmacyBranch.findFirst({
      where: { id: branchId, pharmacyId },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found.');
    }
  }

  /** Load and shape the full detail payload for one pharmacy. */
  private async buildDetail(id: string): Promise<PharmacyDetailResponse> {
    const pharmacy = await this.prisma.pharmacy.findFirst({
      where: { id },
      select: {
        id: true,
        name: true,
        createdAt: true,
        branches: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: BRANCH_SELECT,
        },
        users: {
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            status: true,
            branchId: true,
            createdAt: true,
            branch: { select: { name: true } },
          },
        },
      },
    });
    if (!pharmacy) {
      throw new NotFoundException('Pharmacy not found.');
    }

    return {
      id: pharmacy.id,
      name: pharmacy.name,
      createdAt: pharmacy.createdAt,
      branchCount: pharmacy.branches.length,
      userCount: pharmacy.users.length,
      adminCount: pharmacy.users.filter(
        (user) => user.role === 'PHARMACY_ADMIN',
      ).length,
      branches: pharmacy.branches.map((branch) =>
        this.toBranchResponse(branch),
      ),
      users: pharmacy.users.map(({ branch, ...user }) => ({
        ...user,
        branchName: branch?.name ?? null,
      })),
    };
  }
}
