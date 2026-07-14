import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@repo/db';
import type { User } from '@repo/db';
import type {
  BranchDetailResponse,
  BranchDirectoryRequest,
  BranchDirectoryResponse,
  BranchStockedMedicine,
  DirectoryBranch,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { haversineKm } from '../common/geo';

// Columns for a directory branch row (pharmacy resolved for its name/id).
const BRANCH_SELECT = {
  id: true,
  name: true,
  address: true,
  phoneNumber: true,
  latitude: true,
  longitude: true,
  pharmacy: { select: { id: true, name: true } },
} satisfies Prisma.PharmacyBranchSelect;

type BranchRow = Prisma.PharmacyBranchGetPayload<{
  select: typeof BRANCH_SELECT;
}>;

@Injectable()
export class DirectoryService {
  private readonly logger = new Logger(DirectoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public pharmacy directory: every branch, optionally filtered by a name /
   * address search. Ordered nearest-first from the caller's origin (an explicit
   * lat/lng override, else their saved location); when no origin is known, falls
   * back to a stable name ordering. Global read — no tenant scope, no writes.
   */
  async list(
    query: BranchDirectoryRequest,
    actor: User,
  ): Promise<BranchDirectoryResponse> {
    const search = query.search?.trim();
    const where: Prisma.PharmacyBranchWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { address: { contains: search, mode: 'insensitive' } },
            { pharmacy: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {};

    const branches = await this.prisma.pharmacyBranch.findMany({
      where,
      // Deterministic base order; re-sorted by distance below when an origin
      // is known.
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: BRANCH_SELECT,
    });

    const lat =
      query.lat ?? (actor.latitude === null ? null : actor.latitude.toNumber());
    const lng =
      query.lng ??
      (actor.longitude === null ? null : actor.longitude.toNumber());
    const hasOrigin = lat !== null && lng !== null;

    const rows: DirectoryBranch[] = branches.map((branch) =>
      this.toDirectoryBranch(branch, lat, lng),
    );
    if (hasOrigin) {
      rows.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    return {
      orderedByDistance: hasOrigin,
      branches: rows,
      total: rows.length,
    };
  }

  /**
   * One branch's public profile plus the medicines it currently stocks
   * (in-stock, non-expired batches rolled up per medicine). 404 if the branch
   * doesn't exist.
   */
  async detail(id: string): Promise<BranchDetailResponse> {
    const branch = await this.prisma.pharmacyBranch.findFirst({
      where: { id },
      select: BRANCH_SELECT,
    });
    if (!branch) {
      throw new NotFoundException('Pharmacy branch not found.');
    }

    // In-stock rollup per medicine at this branch: total quantity + nearest
    // expiry. Exclude expired batches (unsellable) — bound expiry at today
    // 00:00 UTC (@db.Date), so a batch expiring today still counts.
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const grouped = await this.prisma.stockBatch.groupBy({
      by: ['medicineId'],
      where: {
        branchId: id,
        quantity: { gt: 0 },
        expiryDate: { gte: todayStart },
      },
      _sum: { quantity: true },
      _min: { expiryDate: true },
    });

    let medicines: BranchStockedMedicine[] = [];
    if (grouped.length > 0) {
      const catalog = await this.prisma.medicine.findMany({
        where: { id: { in: grouped.map((group) => group.medicineId) } },
        select: {
          id: true,
          brandName: true,
          form: true,
          dosage: true,
          priceLbp: true,
        },
      });
      const byId = new Map(catalog.map((medicine) => [medicine.id, medicine]));

      medicines = grouped
        .map((group): BranchStockedMedicine | null => {
          const medicine = byId.get(group.medicineId);
          if (!medicine) return null;
          return {
            medicineId: medicine.id,
            brandName: medicine.brandName,
            form: medicine.form,
            dosage: medicine.dosage,
            priceLbp:
              medicine.priceLbp === null ? null : medicine.priceLbp.toNumber(),
            totalQuantity: group._sum.quantity ?? 0,
            nearestExpiry: group._min.expiryDate ?? null,
          };
        })
        .filter(
          (medicine): medicine is BranchStockedMedicine => medicine !== null,
        )
        .sort((a, b) => a.brandName.localeCompare(b.brandName));
    }

    return {
      branchId: branch.id,
      pharmacyId: branch.pharmacy.id,
      pharmacyName: branch.pharmacy.name,
      branchName: branch.name,
      address: branch.address,
      phoneNumber: branch.phoneNumber,
      latitude: branch.latitude.toNumber(),
      longitude: branch.longitude.toNumber(),
      medicines,
    };
  }

  private toDirectoryBranch(
    branch: BranchRow,
    originLat: number | null,
    originLng: number | null,
  ): DirectoryBranch {
    const latitude = branch.latitude.toNumber();
    const longitude = branch.longitude.toNumber();
    return {
      branchId: branch.id,
      pharmacyId: branch.pharmacy.id,
      pharmacyName: branch.pharmacy.name,
      branchName: branch.name,
      address: branch.address,
      phoneNumber: branch.phoneNumber,
      latitude,
      longitude,
      distanceKm:
        originLat !== null && originLng !== null
          ? Math.round(
              haversineKm(originLat, originLng, latitude, longitude) * 10,
            ) / 10
          : null,
    };
  }
}
