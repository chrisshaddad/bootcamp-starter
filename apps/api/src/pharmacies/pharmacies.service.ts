import { Injectable } from '@nestjs/common';
import type { PharmacyListResponse } from '@repo/contracts';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class PharmaciesService {
  constructor(private readonly prisma: PrismaService) {}

  /** All pharmacies, for selection dropdowns. Always reflects live data. */
  async list(): Promise<PharmacyListResponse> {
    const pharmacies = await this.prisma.pharmacy.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return { pharmacies };
  }
}
