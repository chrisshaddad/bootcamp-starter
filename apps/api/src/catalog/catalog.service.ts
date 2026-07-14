import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { User } from '@repo/db';
import type {
  BranchAvailability,
  MedicineAvailabilityRequest,
  MedicineAvailabilityResponse,
  MedicineResponse,
} from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';
import { MedicinesService } from '../medicines/medicines.service';
import { haversineKm } from '../common/geo';

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly medicines: MedicinesService,
  ) {}

  /**
   * Other medicines that share an active ingredient with this one (generic /
   * substitute candidates), via the Ingredient ↔ MedicineIngredient join,
   * excluding the medicine itself. Empty when the medicine has no linked
   * ingredients or nothing else shares them.
   */
  async alternatives(id: string): Promise<MedicineResponse[]> {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!medicine) {
      throw new NotFoundException('Medicine not found.');
    }

    const links = await this.prisma.medicineIngredient.findMany({
      where: { medicineId: id },
      select: { ingredientId: true },
    });
    const ingredientIds = links.map((link) => link.ingredientId);
    if (ingredientIds.length === 0) return [];

    // Return every medicine that shares an ingredient, ranked by how many
    // ingredients overlap (closest substitutes first). The client paginates the
    // list, so nothing is dropped even when an ingredient is widely shared.
    const shared = await this.prisma.medicineIngredient.groupBy({
      by: ['medicineId'],
      where: { ingredientId: { in: ingredientIds }, medicineId: { not: id } },
      _count: { ingredientId: true },
      orderBy: { _count: { ingredientId: 'desc' } },
    });
    const orderedIds = shared.map((row) => row.medicineId);
    // listByIds returns them alphabetically; restore the relevance order.
    const medicines = await this.medicines.listByIds(orderedIds);
    const byId = new Map(medicines.map((medicine) => [medicine.id, medicine]));
    return orderedIds
      .map((medicineId) => byId.get(medicineId))
      .filter(
        (medicine): medicine is MedicineResponse => medicine !== undefined,
      );
  }

  /**
   * Pharmacy branches that currently stock this medicine, sorted nearest-first
   * from the caller's origin (an explicit lat/lng override, else their saved
   * location). In-stock only. When no origin is known, returns
   * `hasLocation: false` and no branches so the client can prompt for a
   * location instead of showing an unordered list.
   */
  async availability(
    id: string,
    query: MedicineAvailabilityRequest,
    actor: User,
  ): Promise<MedicineAvailabilityResponse> {
    const medicine = await this.prisma.medicine.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!medicine) {
      throw new NotFoundException('Medicine not found.');
    }

    const lat =
      query.lat ?? (actor.latitude === null ? null : actor.latitude.toNumber());
    const lng =
      query.lng ??
      (actor.longitude === null ? null : actor.longitude.toNumber());
    if (lat === null || lng === null) {
      return { hasLocation: false, branches: [] };
    }

    // In-stock rollup per branch: total quantity, batch count, nearest expiry.
    // Exclude expired batches — they are unsellable, so a client should never be
    // routed to a branch whose only stock has lapsed. Expiry is stored as
    // @db.Date (UTC midnight); a batch expiring today is still valid, so bound at
    // today 00:00 UTC with `gte` (already-expired batches fall before it).
    const now = new Date();
    const todayStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const grouped = await this.prisma.stockBatch.groupBy({
      by: ['branchId'],
      where: {
        medicineId: id,
        quantity: { gt: 0 },
        expiryDate: { gte: todayStart },
      },
      _sum: { quantity: true },
      _count: { _all: true },
      _min: { expiryDate: true },
    });
    if (grouped.length === 0) {
      return { hasLocation: true, branches: [] };
    }

    const branches = await this.prisma.pharmacyBranch.findMany({
      where: { id: { in: grouped.map((row) => row.branchId) } },
      select: {
        id: true,
        name: true,
        address: true,
        phoneNumber: true,
        latitude: true,
        longitude: true,
        pharmacy: { select: { id: true, name: true } },
      },
    });
    const branchById = new Map(branches.map((branch) => [branch.id, branch]));

    const rows: BranchAvailability[] = [];
    for (const group of grouped) {
      const branch = branchById.get(group.branchId);
      if (!branch) continue;
      const branchLat = branch.latitude.toNumber();
      const branchLng = branch.longitude.toNumber();
      rows.push({
        branchId: branch.id,
        pharmacyId: branch.pharmacy.id,
        pharmacyName: branch.pharmacy.name,
        branchName: branch.name,
        address: branch.address,
        phoneNumber: branch.phoneNumber,
        latitude: branchLat,
        longitude: branchLng,
        distanceKm:
          Math.round(haversineKm(lat, lng, branchLat, branchLng) * 10) / 10,
        totalQuantity: group._sum.quantity ?? 0,
        batchCount: group._count._all,
        nearestExpiry: group._min.expiryDate ?? null,
      });
    }

    rows.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return { hasLocation: true, branches: rows };
  }
}
