import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { AvailableUnit, AvailableUnitListResponse } from '@repo/contracts';

@Injectable()
export class AvailableUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Format helpers ────────────────────────────────────────────────────────

  private formatAvailableUnit(apartment: {
    id: string;
    buildingId: string;
    floorId: string;
    unitNumber: string;
    bedrooms: number;
    bathrooms: Prisma.Decimal;
    sqft: number | null;
    building: { name: string };
    floor: { name: string };
  }): AvailableUnit {
    return {
      id: apartment.id,
      buildingId: apartment.buildingId,
      buildingName: apartment.building.name,
      floorId: apartment.floorId,
      floorName: apartment.floor.name,
      unitNumber: apartment.unitNumber,
      bedrooms: apartment.bedrooms,
      bathrooms: apartment.bathrooms.toString(),
      sqft: apartment.sqft,
    };
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  /**
   * F6.2 — every vacant apartment in the org, enriched with building/floor
   * names for the renter-facing "Available units" showcase. Deliberately NOT
   * building-access scoped like the nested apartments/leases reads: a tenant
   * isn't building-assigned, and this showcase is meant to surface every
   * vacant unit org-wide, not just the caller's assigned buildings.
   */
  async findAvailable(orgId: string): Promise<AvailableUnitListResponse> {
    const apartments = await this.prisma.apartment.findMany({
      where: { orgId, status: 'vacant' },
      include: {
        building: { select: { name: true } },
        floor: { select: { name: true } },
      },
      orderBy: [{ building: { name: 'asc' } }, { unitNumber: 'asc' }],
    });

    return { data: apartments.map((a) => this.formatAvailableUnit(a)) };
  }
}
