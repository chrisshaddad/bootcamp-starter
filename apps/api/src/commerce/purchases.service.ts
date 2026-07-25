import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/db';
import { PrismaService } from '../database/prisma.service';
import type { PurchaseListResponse } from '@repo/contracts';

const purchaseInclude = {
  bookCopy: {
    include: {
      book: { select: { id: true, title: true, coverUrl: true } },
    },
  },
} satisfies Prisma.PurchaseInclude;

interface FindAllOptions {
  memberId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List purchases for the library (staff view), typically filtered by
   * `memberId` for a member's purchase history. Tenant-scoped by organizationId.
   */
  async findAll(
    organizationId: string,
    options: FindAllOptions = {},
  ): Promise<PurchaseListResponse> {
    const { memberId, page = 1, limit = 20 } = options;

    const where: Prisma.PurchaseWhereInput = {
      organizationId,
      ...(memberId ? { memberId } : {}),
    };

    const [purchases, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        orderBy: { purchasedAt: 'desc' },
        include: purchaseInclude,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.purchase.count({ where }),
    ]);

    return {
      // Prisma Decimal serializes to a string over the wire (see checkout).
      purchases: purchases.map((purchase) => ({
        ...purchase,
        price: purchase.price.toString(),
      })),
      total,
    };
  }
}
